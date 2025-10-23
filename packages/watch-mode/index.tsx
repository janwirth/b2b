import fs from "fs/promises";
import React, { useEffect, useRef, useState } from "react";
import { Badge, Spinner, UnorderedList } from "@inkjs/ui";
import Image from "@inkkit/ink-image";
import { Box, render, Text } from "ink";
import open from "open";

import type { Context } from "../step-library/steps";
import { ErrorBoundary } from "./functional-error-boundary";
import { assertUnreachable, findBestStep } from "../step-library/steps";
import { parseFeatures } from "../feature-parser/parser-flow";
import {
  type DecodedFeature,
  type DecodedScenario,
} from "../feature-parser/parser-flow";
import { useRunnerInput } from "./useRunnerInput";

const useLatestFeatures = () => {
  const [parseResult, setParseResult] = useState<
    { type: "loaded"; features: DecodedFeature[] } | { type: "pending" }
  >({ type: "pending" });
  useEffect(() => {
    const files = loadFeatures().then(parseFeatures);
    files.then((features) => setParseResult({ type: "loaded", features }));
    const watcher = watch("features", (event, filename) => {
      loadFeatures()
        .then(parseFeatures)
        .then((features) => setParseResult({ type: "loaded", features }));
    });
    return () => {
      watcher.close();
    };
  }, []);
  return parseResult;
};

import { watch } from "fs";
import { parseStep } from "@janwirth/b2b/packages/step-library/steps";
import { getFeatureFiles } from "../feature-parser/yadda-parser";
import { loadFeatures } from "../../tests/loadFeatures";
import { getParseResults } from "../feature-parser/loadFeatures";
import { runScenario } from "../runner/runScenario";
import { A } from "@mobily/ts-belt";

const App = () => {
  const parseResult = useLatestFeatures();
  useEffect(() => {}, [parseResult]);
  if (parseResult.type == "pending") {
    return (
      <Box gap={1}>
        <Text>Loading</Text>
      </Box>
    );
  } else if (parseResult.type == "loaded") {
    return (
      <Box gap={8}>
        <Runner
          onReloadFeature={() => {}}
          features={parseResult.features}
        ></Runner>

        <ParseResultsDisplay features={parseResult.features} />
      </Box>
    );
  }

  return <Text color="green">ASSERT UNREACHABLE</Text>;
};
const Runner = ({
  features,
  onReloadFeature,
}: {
  features: DecodedFeature[];
  onReloadFeature: () => void;
}) => {
  const {
    focus,
    featuresToRun,
    passedFeatures,
    failedFeatures,
    headless,
    closeAfterFail,
    addFailedFeature,
    addPassedFeature,
    removeFeatureFromRun,
  } = useRunnerInput(features, onReloadFeature);

  const runningFeatures = featuresToRun.slice(0, 1);
  return (
    <Box flexDirection="column" gap={2}>
      <Controls headless={headless} closeAfterFail={closeAfterFail}></Controls>
      <UnorderedList>
        {features.map((feature, index) => (
          <UnorderedList.Item key={feature.title}>
            {
              <ErrorBoundary>
                <Box gap={1}>
                  {focus == index ? <Text>➤</Text> : <Text>_</Text>}
                  {passedFeatures.includes(feature.title) ? (
                    <Badge color="green">Pass</Badge>
                  ) : (
                    <></>
                  )}
                  {runningFeatures.includes(feature.title) ? (
                    <Badge color="cyan">RUN</Badge>
                  ) : featuresToRun.includes(feature.title) ? (
                    <Badge color="blue">SOON</Badge>
                  ) : (
                    <></>
                  )}
                  {failedFeatures
                    .map((f) => f.title)
                    .includes(feature.title) && <Badge color="red">fail</Badge>}
                  {/* {<Badge color="beige">{feature.skipReason}</Badge>} */}
                  <Box flexDirection="column">
                    <Text>{feature.title}</Text>

                    {runningFeatures.includes(feature.title) && (
                      <RunFeature
                        closeAfterFail={closeAfterFail}
                        headless={headless}
                        feature={feature}
                        onFail={({ message, image }) => {
                          removeFeatureFromRun(feature.title);
                          addFailedFeature({
                            title: feature.title,
                            message,
                            image,
                          });
                        }}
                        onPass={() => {
                          removeFeatureFromRun(feature.title);
                          addPassedFeature(feature.title);
                        }}
                      ></RunFeature>
                    )}
                  </Box>
                </Box>
              </ErrorBoundary>
            }
          </UnorderedList.Item>
        ))}
      </UnorderedList>
      <UnorderedList>
        {A.uniqBy(failedFeatures, (f) => f.title).map((f) => (
          <UnorderedList.Item key={f.title}>
            <Box flexDirection="column">
              <Box>
                <Badge color={"red"}>FAIL</Badge>
                <Text> {f.title}</Text>
              </Box>
              <Text>{f.message}</Text>
              <Text>{JSON.stringify(f.image)}</Text>
              {f.image && <Image width={30} height={30} src={f.image} />}
            </Box>
          </UnorderedList.Item>
        ))}
      </UnorderedList>
    </Box>
  );
};
const Controls = ({
  headless,
  closeAfterFail,
}: {
  headless: boolean;
  closeAfterFail: boolean;
}) => {
  return (
    <Box gap={2}>
      <Text>Headless [H]: {headless ? "Yes" : "No"}</Text>
      <Text>Close after Fail [C]: {closeAfterFail ? "Yes" : "No"}</Text>
      {/* <Text>Reload Specs [R]</Text> */}
    </Box>
  );
};
const RunFeature = ({
  headless,
  closeAfterFail,
  feature,
  onPass,
  onFail,
}: {
  headless: boolean;
  closeAfterFail: boolean;
  feature: DecodedFeature;
  onPass: () => void;
  onFail: (data: { type: "failure"; message: string; image?: string }) => void;
}) => {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const scenario: DecodedScenario | undefined = feature.scenarios[scenarioIdx];
  useEffect(() => {
    // no more scenarios left
    if (!scenario) {
      onPass();
    }
  }, [scenario?.title]);
  if (!scenario) {
    return <Text>No more scenarios</Text>;
  }
  return (
    <Box flexDirection="column">
      <Text bold>{scenario.title}</Text>
      <RunScenario
        feature={feature}
        scenario={scenario}
        headless={headless}
        closeAfterFail={closeAfterFail}
        key={scenario.title}
        onComplete={() => setScenarioIdx(scenarioIdx + 1)}
        onFail={async (fail) => {
          onFail({ ...fail });
        }}
      />
    </Box>
  );
};

const RunScenario = ({
  feature,
  scenario,
  onComplete,
  onFail,
  headless,
  closeAfterFail,
}: {
  feature: DecodedFeature;
  scenario: DecodedScenario;
  onComplete: () => void;
  onFail: (data: { type: "failure"; message: string; image?: string }) => void;
  headless: boolean;
  closeAfterFail: boolean;
}) => {
  const [status, setStatus] = useState(`Starting scenario ${scenario.title}`);
  useEffect(() => {
    (async () => {
      // in live mode, we don't want to run scenarios that are skipped because another scenario is focused
      // but if other feature is focused, we want to run it - the user has explictily selected this feature to run.
      if (scenario.skipReason == "other-scenario-focused") {
        onComplete();
        return;
      }
      const result = await runScenario(
        feature,
        scenario,
        headless,
        (update) => {
          switch (update.type) {
            case "step_started":
              setStatus(`Running step ${update.step}`);
              break;
            // default:
            //   assertUnreachable(update);
          }
        }
      );
      if (result.type === "runner_error") {
        onFail({ type: "failure", message: result.message });
      } else {
        onComplete();
      }
    })();
  }, [scenario.title]);
  return (
    <>
      <Box gap={1}>
        <Spinner></Spinner>
        <Text>{status}</Text>
      </Box>
    </>
  );
};
type StepParseResult = ReturnType<typeof findBestStep>;
type ParsedStep = Exclude<StepParseResult, { type: "Err" }>;

const ParseResultsDisplay = ({ features }: { features: DecodedFeature[] }) => {
  const feat = features.flatMap((feature) =>
    feature.scenarios.flatMap((scenario) => scenario.steps.map((step) => step))
  );
  const parseResults = getParseResults(features);

  if (parseResults.errors.length === 0) {
    return null; // Don't show anything if there are no errors
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="red">
        Parse Errors:
      </Text>
      <UnorderedList>
        {parseResults.errors.map((error, index) => (
          <UnorderedList.Item key={index}>
            <Box flexDirection="column" gap={1}>
              <Box>
                <Text color="red">{error.featureTitle}</Text>
                <Text> → </Text>
                <Text color="yellow">{error.scenarioTitle}</Text>
                <Text> (step {error.stepIndex + 1})</Text>
              </Box>
              <Text color="gray">Step: {error.stepText}</Text>
              <Text color="cyan">{error.suggestions}</Text>
            </Box>
          </UnorderedList.Item>
        ))}
      </UnorderedList>
    </Box>
  );
};

export const start_interactive = () => {
  //you need this
  // https://github.com/oven-sh/bun/issues/6862
  process.stdin.resume();
  const app = render(<App />);
  return app.waitUntilExit();
};
