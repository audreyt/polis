import http from "node:http";

/**
 * The hostname for the local SES server. Defaults to "localhost".
 * @type {string}
 */
const SES_LOCAL_HOST = process.env.SES_LOCAL_HOST || "localhost";

/**
 * The port for the local SES server. Defaults to 8005.
 * @type {number}
 */
const SES_LOCAL_PORT = parseInt(process.env.SES_LOCAL_PORT || "8005", 10);

/**
 * Represents an email recipient with an address and an optional name.
 * @interface
 */
interface EmailRecipient {
  /** The email address of the recipient. */
  address: string;
  /** The optional display name of the recipient. */
  name?: string;
}

/**
 * Represents a standardized email object.
 * @interface
 */
interface EmailObject {
  /** A unique identifier for the email. */
  id: string;
  /** The subject line of the email. */
  subject: string;
  /** The plain text content of the email. */
  text: string;
  /** The HTML content of the email, if available. */
  html?: string;
  /** An array of recipients in the 'To' field. */
  to: EmailRecipient[];
  /** The sender of the email. */
  from: EmailRecipient;
  /** The date of the email in ISO 8601 format. */
  date: string;
  /** The date of the email as a Date object. */
  time?: Date;
  /** Allows for any other properties. */
  [key: string]: any;
}

/**
 * Options for polling when searching for an email.
 * @interface
 */
interface FindEmailOptions {
  /** Total time in milliseconds to wait for the email. Defaults to 10000. */
  timeout?: number;
  /** Time in milliseconds between each fetch attempt. Defaults to 1000. */
  interval?: number;
  /** The maximum number of attempts to make. Defaults to 10. */
  maxAttempts?: number;
}

/**
 * The result of extracting a password reset URL and token from an email.
 * @interface
 */
interface PasswordResetResult {
  /** The full password reset URL, or null if not found. */
  url: string | null;
  /** The password reset token, or null if not found. */
  token: string | null;
}

// Internal types for parsing the /store endpoint response.
/**
 * @internal
 * The body of an email from the /store endpoint.
 */
interface StoreBody {
  html: string;
  text: string;
}

/**
 * @internal
 * The destination object for an email from the /store endpoint.
 */
interface StoreDestination {
  to: string[];
  cc: string[];
  bcc: string[];
}

/**
 * @internal
 * The raw email object structure from the /store endpoint.
 */
interface StoreEmailObject {
  messageId: string;
  from: string;
  destination: StoreDestination;
  subject: string;
  body: StoreBody;
  at: number; // Unix timestamp
}

/**
 * @internal
 * The top-level response structure from the /store endpoint.
 */
interface StoreResponse {
  emails: StoreEmailObject[];
}

/**
 * Maps the raw email format from the /store endpoint to the consistent EmailObject format.
 * @param {StoreEmailObject} storeEmail - The raw email object from the store.
 * @returns {EmailObject} The mapped, standardized email object.
 */
function mapStoreToEmailObject(storeEmail: StoreEmailObject): EmailObject {
  const timestamp = new Date(storeEmail.at * 1000); // Convert Unix timestamp to Date
  return {
    id: storeEmail.messageId,
    subject: storeEmail.subject,
    text: storeEmail.body.text,
    html: storeEmail.body.html,
    to: storeEmail.destination.to.map((address) => ({ address })),
    from: { address: storeEmail.from },
    date: timestamp.toISOString(),
    time: timestamp,
  };
}

/**
 * Fetches all emails from the local SES server's /store endpoint.
 * @async
 * @returns {Promise<EmailObject[]>} A promise that resolves to an array of email objects.
 * @throws {Error} Throws an error if the request fails or the response cannot be parsed.
 */
async function getEmails(): Promise<EmailObject[]> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SES_LOCAL_HOST,
      port: SES_LOCAL_PORT,
      path: "/store",
      method: "GET",
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const response = JSON.parse(data) as StoreResponse;
          const rawEmails = response.emails as StoreEmailObject[];

          if (!Array.isArray(rawEmails)) {
            resolve([]); // Resolve with empty array if no emails are present
            return;
          }
          resolve(rawEmails.map(mapStoreToEmailObject));
        } catch (e) {
          reject(
            new Error(
              `Failed to parse email response: ${
                e instanceof Error ? e.message : String(e)
              }`
            )
          );
        }
      });
    });

    req.on("error", (error) =>
      reject(new Error(`Failed to fetch emails: ${error.message}`))
    );
    req.end();
  });
}

/**
 * Retrieves a specific email by its ID. It fetches all emails and filters them.
 * @async
 * @param {string} id - The unique identifier of the email to retrieve.
 * @returns {Promise<EmailObject>} A promise that resolves to the found email object.
 * @throws {Error} Throws an error if no email with the specified ID is found.
 */
async function getEmail(id: string): Promise<EmailObject> {
  const emails = await getEmails();
  const foundEmail = emails.find((email) => email.id === id);
  if (foundEmail) {
    return foundEmail;
  }
  throw new Error(`Email with id ${id} not found.`);
}

/**
 * Polls the local SES server to find the most recent email sent to a specific recipient.
 * @async
 * @param {string} recipient - The email address of the recipient to search for.
 * @param {FindEmailOptions} [options={}] - Polling options (timeout, interval, maxAttempts).
 * @returns {Promise<EmailObject>} A promise that resolves to the most recent email found for the recipient.
 * @throws {Error} Throws an error if no email is found for the recipient within the specified timeout and attempts.
 */
async function findEmailByRecipient(
  recipient: string,
  options: FindEmailOptions = {}
): Promise<EmailObject> {
  const { timeout = 10000, interval = 1000, maxAttempts = 10 } = options;
  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < timeout && attempts < maxAttempts) {
    attempts++;
    try {
      const emails = await getEmails();
      const targetEmails = emails.filter((email) =>
        email.to?.some(
          (to) => to.address.toLowerCase() === recipient.toLowerCase()
        )
      );

      if (targetEmails.length > 0) {
        // Sort by date to get the most recent email and return it
        return targetEmails.sort((a, b) => {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return dateB - dateA; // Most recent first
        })[0];
      }
    } catch (error) {
      console.warn(
        `Error fetching emails (attempt ${attempts}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  throw new Error(
    `No email found for recipient ${recipient} after ${attempts} attempts`
  );
}

/**
 * Extracts a password reset URL and token from the text body of an email.
 * It looks for a URL containing '/pwreset/'.
 * @param {EmailObject} email - The email object to parse.
 * @returns {PasswordResetResult} An object containing the extracted URL and token, or null if not found.
 */
function extractPasswordResetUrl(email: EmailObject): PasswordResetResult {
  if (email?.text) {
    let token: string | null = null,
      url: string | null = null;
    const urlMatch = email.text.match(
      /(https?:\/\/[^\s]+pwreset\/([a-zA-Z0-9_-]+))/
    );
    if (urlMatch?.[1]) {
      url = urlMatch[1];
      token = urlMatch[2];
    }
    return { url, token };
  }
  return { url: null, token: null };
}

/**
 * Finds an email for a recipient and extracts the password reset URL from it.
 * @async
 * @param {string} recipient - The email address of the recipient.
 * @param {FindEmailOptions} [options={}] - Polling options to find the email.
 * @returns {Promise<PasswordResetResult>} A promise that resolves to the password reset URL and token.
 * @throws {Error} Throws an error if the email is not found or if the URL cannot be extracted.
 */
async function getPasswordResetUrl(
  recipient: string,
  options: FindEmailOptions = {}
): Promise<PasswordResetResult> {
  const email = await findEmailByRecipient(recipient, options);
  const result = extractPasswordResetUrl(email);
  if (!result.url) {
    throw new Error("Password reset URL not found in email");
  }
  return result;
}

export { findEmailByRecipient, getEmail, getEmails, getPasswordResetUrl };

export type {
  EmailObject,
  EmailRecipient,
  FindEmailOptions,
  PasswordResetResult,
};
