# Feature Annotation Parsing Flow

This diagram explains how feature and scenario annotations are parsed and how skip logic works.

## Key Rules:

### Feature Level:

1. **@focus**: Feature is focused, not skipped
2. **@skip**: Feature is explicitly skipped
3. **No annotations + focused feature exists**: Feature is skipped due to focus logic
4. **No annotations + no focused features**: Feature runs normally

### Scenario Level:

1. **@focus**: Scenario is focused, not skipped
2. **@skip**: Scenario is explicitly skipped
3. **@shouldFail**: Scenario is expected to fail
4. **In focused feature**: Scenarios run normally
5. **In non-focused feature + focused feature exists**: Scenarios are skipped

### Skip Reasons:

- **null**: Not skipped
- **"feature-explicit-skip"**: Explicitly skipped with @skip OR skipped due to focus logic
- **"other-feature-focused"**: Skipped because another feature is focused
- **"scenario-explicit-skip"**: Scenario explicitly skipped with @skip
- **"other-scenario-focused"**: Scenario skipped because another scenario is focused
