# Feature Annotation Parsing Flow

This diagram explains how feature and scenario annotations are parsed and how skip logic works.

```mermaid
flowchart TD
    A[Parse Feature Files] --> B[Extract Raw Annotations]
    B --> C{Has @focus Feature?}

    C -->|Yes| D[Set oneFocused = true]
    C -->|No| E[Set oneFocused = false]

    D --> F[Process Each Feature]
    E --> F

    F --> G{Feature has @focus?}
    G -->|Yes| H[isFocused = true<br/>isSkipped = false]
    G -->|No| I{Feature has @skip?}

    I -->|Yes| J[isFocused = false<br/>isSkipped = true]
    I -->|No| K{oneFocused = true?}

    K -->|Yes| L[isFocused = false<br/>isSkipped = true]
    K -->|No| M[isFocused = false<br/>isSkipped = false]

    H --> N[Determine skipReason]
    J --> N
    L --> N
    M --> N

    N --> O{isSkipped?}
    O -->|No| P[skipReason = null]
    O -->|Yes| Q{isFocused?}

    Q -->|Yes| R["skipReason = other-feature-focused"]
    Q -->|No| S["skipReason = feature-explicit-skip"]

    P --> T[Process Scenarios]
    R --> T
    S --> T

    T --> U[For Each Scenario]
    U --> V{Scenario has @focus?}
    V -->|Yes| W[isFocused = true<br/>isSkipped = false]
    V -->|No| X{Scenario has @skip?}

    X -->|Yes| Y[isFocused = false<br/>isSkipped = true]
    X -->|No| Z{Feature is focused?}

    Z -->|Yes| AA[isFocused = false<br/>isSkipped = false]
    Z -->|No| BB{oneFocused = true?}

    BB -->|Yes| CC[isFocused = false<br/>isSkipped = true]
    BB -->|No| DD[isFocused = false<br/>isSkipped = false]

    W --> EE[Determine scenario skipReason]
    Y --> EE
    AA --> EE
    CC --> EE
    DD --> EE

    EE --> FF{isSkipped?}
    FF -->|No| GG[skipReason = null]
    FF -->|Yes| HH{isFocused?}

    HH -->|Yes| II[skipReason = "other-scenario-focused"]
    HH -->|No| JJ{shouldFail?}

    JJ -->|Yes| KK[skipReason = "scenario-explicit-skip"]
    JJ -->|No| LL[skipReason = "other-feature-focused"]

    GG --> MM[Final Feature Result]
    II --> MM
    KK --> MM
    LL --> MM

    MM --> NN[Return Parsed Features]

    style A fill:#e1f5fe
    style NN fill:#c8e6c9
    style H fill:#fff3e0
    style P fill:#c8e6c9
    style R fill:#ffecb3
    style S fill:#ffcdd2
```

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
