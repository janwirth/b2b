# @packages/runner

A modular feature runner that executes BDD features and provides progress updates through callbacks.

## Usage

```typescript
import { runFeature, type RunnerUpdate } from "@packages/runner";
import { getAllFeatures } from "@packages/feature-parser";

// Load and run a feature
const { features } = await getAllFeatures();
const feature = features[0];

const result = await runFeature(feature, {
  headless: true,
  closeAfterFail: true,
  onUpdate: (update: RunnerUpdate) => {
    console.log("Update:", update);
  },
});

console.log(`Completed in ${result.duration_ms}ms`);
```

## API

### `runFeature(feature, options)`

Runs a single feature and returns execution details.

**Parameters:**

- `feature: Feature` - The feature to run
- `options: RunnerOptions` - Configuration options

**Returns:**

- `Promise<{ duration_ms: number }>` - Execution duration on success
- Throws `RunnerError` on failure

### `RunnerOptions`

```typescript
type RunnerOptions = {
  headless?: boolean; // Run browser in headless mode (default: true)
  closeAfterFail?: boolean; // Close browser after failure (default: true)
  onUpdate?: (update: RunnerUpdate) => void; // Progress callback
};
```

### `RunnerUpdate`

Progress updates sent through the callback:

```typescript
type RunnerUpdate =
  | { type: "scenario_started"; scenarioTitle: string }
  | { type: "step_started"; step: string }
  | { type: "step_completed"; step: string }
  | { type: "scenario_completed"; scenarioTitle: string }
  | { type: "feature_completed"; featureTitle: string; duration_ms: number };
```

### `RunnerError`

Thrown when feature execution fails:

```typescript
class RunnerError extends Error {
  constructor(
    message: string,
    public scenarioTitle: string,
    public step: string,
    public image?: string // Path to failure screenshot
  );
}
```

## Error Handling

The runner throws `RunnerError` instances for failures, which include:

- Error message
- Scenario title where failure occurred
- Step that failed
- Optional screenshot path for visual debugging

## Example

See `example.ts` for a complete usage example.


