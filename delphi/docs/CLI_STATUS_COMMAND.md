# Delphi CLI Status Command

The Delphi CLI includes a `status` command that allows users to quickly check the status of a conversation's analysis, including layers, clusters, and topic information.

## Purpose

This command provides a quick way to verify that a conversation has been successfully processed, without requiring an LLM to generate a report. It shows:

- Basic conversation information (name, comment count, processing date)
- Clustering layers with cluster counts
- Sample topic names for each layer
- Most recent job information for this conversation

## Usage

### Command-line Mode

```bash
# Basic usage
./delphi status <zid>

# Example
./delphi status 27616
```

### Interactive Mode

1. Run `./delphi` to start the interactive mode
2. Select option 4: "Check conversation status"
3. Enter the ZID when prompted

## Implementation Note

In the Polis system, "zid" (conversation ID) is the standard user-facing identifier for conversations. However, in the database tables, this field is named "conversation_id" for historical and compatibility reasons.

The CLI interface maintains the user-facing terminology "zid" while internally translating to "conversation_id" for database operations. This design decision was made to:

1. Maintain compatibility with existing code (over 600 instances of "conversation_id" in the codebase)
2. Provide a consistent and accurate user interface using the correct "zid" terminology
3. Avoid the costly and risky undertaking of renaming fields across the entire system

## Output Format

### Rich Terminal Output

When run in a terminal with the `rich` library installed, the output will include formatted tables and color-coded information:

- Conversation info panel (blue border)
- Clustering layers table (with layer numbers, descriptions, and cluster counts)
- Topic name samples for each layer (up to 5 topics per layer)
- Job status panel (green border)

### Plain Text Output

In plain text mode (when `rich` is not available or when output is redirected), the information is displayed in a simpler format but includes all the same data.

## Integration with Job Queue

The status command works seamlessly with the existing job queue system. It can display information about:

- Completed runs: Shows all layers, clusters, and topics
- In-progress runs: Shows job status as "PROCESSING" 
- Failed runs: Shows job status as "FAILED"