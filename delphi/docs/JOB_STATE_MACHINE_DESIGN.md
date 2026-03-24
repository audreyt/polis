# Job State Machine Design for Delphi

## Overview

The Delphi job system follows a design philosophy where the job type describes both what the job is and what phase it's in. Instead of having generic job types with properties determining behavior, we use explicit, descriptive job types that make the state machine clear and self-documenting.

## Job Types and Workflow

### General Jobs

- `FULL_PIPELINE`: Executes the complete Delphi math pipeline for a conversation

### Narrative Batch Processing

The batch reporting system follows a clear state machine workflow:

1. `CREATE_NARRATIVE_BATCH`: Initial job that creates a batch request 
   - Runs `801_narrative_report_batch.py`
   - Submits requests to Anthropic's Batch API
   - Creates a follow-up job with type `AWAITING_NARRATIVE_BATCH`

2. `AWAITING_NARRATIVE_BATCH`: Job that checks the status of a batch and processes results when complete
   - Runs `803_check_batch_status.py`
   - Checks if the batch is still processing or has completed
   - When batch completes, processes results and updates job status to COMPLETED

## Design Principles

1. **Descriptive State Names**: Each job type clearly indicates its purpose and phase
2. **Self-Documenting**: The state machine is explicit and easy to understand
3. **Deterministic Behavior**: Each job type maps to a specific script/action
4. **Clear Transitions**: State transitions are predictable based on job type

## Implementation

The job poller (`job_poller.py`) determines which script to run based on the job type:

```python
job_type = job.get('job_type', 'FULL_PIPELINE')

if job_type == 'CREATE_NARRATIVE_BATCH':
    # Run 801_narrative_report_batch.py
    # ...
elif job_type == 'AWAITING_NARRATIVE_BATCH':
    # Run 803_check_batch_status.py
    # ...
else:
    # Run standard pipeline
    # ...
```

Each job type has its own specific handling, making the system easy to extend with new job types in the future.

## Benefits

1. More robust and maintainable code
2. Easier to debug - job type clearly indicates intent
3. Simpler reasoning about the system's behavior
4. Clearer logs that show the system's state
5. Less risk of implicit behavior based on job properties

## Future Considerations

When adding new job types, follow these guidelines:

1. Make job types descriptive of both the job and its phase
2. Use verb-noun format for clarity (e.g., CREATE_, PROCESS_, ANALYZE_)
3. Include sufficient metadata in the job for the next phase
4. For multi-stage workflows, create explicit job types for each stage