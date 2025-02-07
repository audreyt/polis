import { isFunction, isString, isUndefined } from "underscore";
import { Pool, QueryResult } from "pg";
import { parse as parsePgConnectionString } from "pg-connection-string";
import QueryStream from "pg-query-stream";

import Config from "../config";
import logger from "../utils/logger";
import { MPromise } from "../utils/metered";

// # DB Connections
//
// heroku pg standard plan has 120 connections
// plus a dev poller connection and a direct db connection
// 3 devs * (2 + 1 + 1) = 12 for devs
// plus the prod and preprod pollers = 14
// round up to 20
// so we can have 25 connections per server, of of which is the preprod server
// so we can have 1 preprod/3 prod servers, or 2 preprod / 2 prod.
//
// Note we use native
const usingReplica = Config.databaseURL !== Config.readOnlyDatabaseURL;
const poolSize = Config.isDevMode ? 2 : usingReplica ? 3 : 12;

// not sure how many of these config options we really need anymore
const pgConnection = Object.assign(
  parsePgConnectionString(Config.databaseURL),
  {
    max: poolSize,
    isReadOnly: false,
    poolLog: function (str: string, level: string) {
      if (pgPoolLevelRanks.indexOf(level) <= pgPoolLoggingLevel) {
        logger.info("pool.primary." + level + " " + str);
      }
    },
  }
);
const readsPgConnection = Object.assign(
  parsePgConnectionString(Config.readOnlyDatabaseURL),
  {
    max: poolSize,
    isReadOnly: true,
    poolLog: function (str: string, level: string) {
      if (pgPoolLevelRanks.indexOf(level) <= pgPoolLoggingLevel) {
        logger.info("pool.readonly." + level + " " + str);
      }
    },
  }
);

// split requests into centralized read/write transactor pool vs read pool for scalability concerns in keeping
// pressure down on the transactor (read+write) server
//
// (alias) const pgnative: typeof Pg | null
// import pgnative
// Object is possibly 'null'.ts(2531)
// @ts-ignore
const readWritePool = new Pool(pgConnection);
// (alias) const pgnative: typeof Pg | null
// import pgnative
// Object is possibly 'null'.ts(2531)
// @ts-ignore
const readPool = new Pool(readsPgConnection);

// Same syntax as pg.client.query, but uses connection pool
// Also takes care of calling 'done'.
function queryImpl(pool: Pool, queryString?: any, ...args: any[]) {
  // variable arity depending on whether or not query has params (default to [])
  let params: never[] | undefined;
  let callback: ((arg0: any, arg1?: any) => void) | undefined;
  if (isFunction(args[1])) {
    params = args[0];
    callback = args[1];
  } else if (isFunction(args[0])) {
    params = [];
    callback = args[0];
  } else {
    throw "unexpected db query syntax";
  }

  // Not sure whether we have to be this careful in calling release for these query results. There may or may
  // not have been a good reason why Mike did this. If just using pool.query works and doesn't exhibit scale
  // under load, might be worth stripping
  pool.connect(
    (
      err: any,
      client: {
        query: (
          arg0: any,
          arg1: any,
          arg2: (err: any, results: any) => void
        ) => void;
      },
      release: (arg0?: undefined) => void
    ) => {
      if (err) {
        if (callback) callback(err);
        // force the pool to destroy and remove a client by passing an instance of Error (or anything truthy, actually) to the done() callback
        release(err);
        logger.error("pg_connect_pool_fail", err);
        return;
      }
      // Anyway, here's the actual query call
      client.query(queryString, params, function (err: any, results: any) {
        if (err) {
          // force the pool to destroy and remove a client by passing an instance of Error (or anything truthy, actually) to the release() callback
          release(err);
        } else {
          release();
        }
        if (callback) callback(err, results);
      });
    }
  );
}

const pgPoolLevelRanks = ["info", "verbose"]; // TODO investigate
const pgPoolLoggingLevel = -1; // -1 to get anything more important than info and verbose. // pgPoolLevelRanks.indexOf("info");

// remove queryreadwriteobj
// remove queryreadonlyobj

function query(...args: any[]) {
  return queryImpl(readWritePool, ...args);
}

function query_readOnly(...args: any[]) {
  return queryImpl(readPool, ...args);
}

function queryP_impl(config: Pool, queryString?: any, params?: undefined) {
  if (!isString(queryString)) {
    return Promise.reject("query_was_not_string");
  }
  // Property 'isReadOnly' does not exist on type 'Pool'.ts(2339)
  // @ts-ignore
  let f = config.isReadOnly ? query_readOnly : query;
  return new Promise(function (resolve, reject) {
    f(queryString, params, function (err: any, result: { rows: unknown }) {
      if (err) {
        return reject(err);
      }
      if (!result || !result.rows) {
        // caller is responsible for testing if there are results
        return resolve([]);
      }
      resolve(result.rows);
    });
  });
}

function queryP(...args: any[]) {
  return queryP_impl(readWritePool, ...args);
}

function queryP_readOnly(...args: any[]) {
  return queryP_impl(readPool, ...args);
}

function queryP_readOnly_wRetryIfEmpty(...args: any[]) {
  return queryP_impl(readPool, ...args).then(function (rows) {
    // (parameter) rows: unknown
    // Object is of type 'unknown'.ts(2571)
    // @ts-ignore
    if (!rows.length) {
      // the replica DB didn't have it (yet?) so try the master.
      return queryP(...args);
    }
    return rows;
  }); // NOTE: this does not retry in case of errors. Not sure what's best in that case.
}

function queryP_metered_impl(
  isReadOnly: boolean,
  name?: string,
  queryString?: undefined,
  params?: undefined
) {
  let f = isReadOnly ? queryP_readOnly : queryP;
  if (isUndefined(name) || isUndefined(queryString) || isUndefined(params)) {
    throw new Error("polis_err_queryP_metered_impl missing params");
  }
  //   (parameter) resolve: (value: unknown) => void
  // 'new' expression, whose target lacks a construct signature, implicitly has an 'any' type.ts(7009)
  // @ts-ignore
  return new MPromise(name, function (resolve, reject) {
    f(queryString, params).then(resolve, reject);
  });
}

function queryP_metered(name: any, queryString: any, params: any) {
  // Type 'IArguments' is not an array type or a string type.
  // Use compiler option '--downlevelIteration' to allow iterating of iterators.ts(2569)
  // @ts-ignore
  return queryP_metered_impl(false, ...arguments);
}

function queryP_metered_readOnly(name: any, queryString: any, params: any) {
  // Type 'IArguments' is not an array type or a string type.
  // Use compiler option '--downlevelIteration' to allow iterating of iterators.ts(2569)
  // @ts-ignore
  return queryP_metered_impl(true, ...arguments);
}

function stream_queryP_readOnly(
  queryString: string,
  params: any[],
  onRow: (row: any) => void,
  onEnd: () => void,
  onError: (error: Error) => void
) {
  const query = new QueryStream(queryString, params);

  readPool.connect((err, client, done) => {
    if (err) {
      onError(err);
      return;
    }

    const stream = client.query(query);

    stream.on("data", (row: QueryResult) => {
      onRow(row);
    });

    stream.on("end", () => {
      done();
      onEnd();
    });

    stream.on("error", (error: Error) => {
      done(error);
      onError(error);
    });
  });
}

export {
  query,
  query_readOnly,
  queryP,
  queryP_metered,
  queryP_metered_readOnly,
  queryP_readOnly,
  queryP_readOnly_wRetryIfEmpty,
  stream_queryP_readOnly,
};

export default {
  query,
  query_readOnly,
  queryP,
  queryP_metered,
  queryP_metered_readOnly,
  queryP_readOnly,
  queryP_readOnly_wRetryIfEmpty,
  stream_queryP_readOnly,
};
