import fs from "fs/promises";
import React, { useEffect, useRef, useState } from "react";
import { Badge, Spinner, UnorderedList } from "@inkjs/ui";
import Image from "@inkkit/ink-image";
import { Box, render, Text } from "ink";
import open from "open";

import type { Context } from "../step-library/steps";
import { ErrorBoundary } from "./functional-error-boundary";
import { findBestStep } from "../step-library/steps";
import {
  getAllFeatures,
  type Feature,
  getParseResults,
  type GetAllFeaturesResult,
} from "../feature-parser/loadFeatures";
import { useRunnerInput } from "./useRunnerInput";

const useLatestFeatures = () => {
  const [parseResult, setParseResult] = useState<
    (GetAllFeaturesResult & { type: "loaded" }) | { type: "pending" }
  >({ type: "pending" });
  useEffect(() => {
    getAllFeatures().then((features) =>
      setParseResult({ type: "loaded", ...features })
    );
    const watcher = watch("features", (event, filename) => {
      getAllFeatures().then((features) =>
        setParseResult({ type: "loaded", ...features })
      );
    });
    return () => {
      watcher.close();
    };
  }, []);
  return parseResult;
};

import { watch } from "fs";

const App = () => {
  const parseResult = useLatestFeatures();
  useEffect(() => {}, [parseResult]);
  if (parseResult.type == "pending") {
    return (
      <Box gap={1}>
        {/* <Spinner></Spinner> */}

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
  features: Feature[];
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
                  {<Badge color="beige">{feature.skipReason}</Badge>}
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
        {failedFeatures.map((f) => (
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
  feature: Awaited<ReturnType<typeof getAllFeatures>>["features"][number];
  onPass: () => void;
  onFail: (data: { type: "failure"; message: string; image?: string }) => void;
}) => {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const scenario: Scenario | undefined = feature.scenarios.items.filter(
    (item) => !item.isSkipped
  )[scenarioIdx];
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
        featureFilePath={feature.filePath}
        headless={headless}
        closeAfterFail={closeAfterFail}
        key={scenario.title}
        scenario={scenario}
        onComplete={() => setScenarioIdx(scenarioIdx + 1)}
        onFail={async (fail) => {
          onFail({ ...fail });
        }}
      />
    </Box>
  );
};

type Scenario = Awaited<
  ReturnType<typeof getAllFeatures>
>["features"][number]["scenarios"]["items"][number];
const RunScenario = ({
  featureFilePath,
  scenario,
  onComplete,
  onFail,
  headless,
  closeAfterFail,
}: {
  featureFilePath: string;
  scenario: Scenario;
  onComplete: () => void;
  onFail: (data: { type: "failure"; message: string; image?: string }) => void;
  headless: boolean;
  closeAfterFail: boolean;
}) => {
  const context = useRef<Context>({
    featureFilePath,
  });
  const [stepIdx, setStepIdx] = useState(0);
  const step: string | undefined = scenario.steps[stepIdx];
  useEffect(() => {
    // no more steps left
    if (!step) {
      context.current.browser?.close();
      onComplete();
    }
  }, [!!step]);
  if (step) {
    const parsed = findBestStep(step);
    if (parsed.type == "Err") {
      throw new Error(parsed.step);
    }
    return (
      <>
        <Box gap={1}>
          <Spinner></Spinner>
          <Text>{step}</Text>
        </Box>
        <RunStep
          idx={stepIdx}
          step={parsed}
          headless={headless}
          context={context.current}
          onSuccess={(res) => {
            setStepIdx(stepIdx + 1);
          }}
          onFail={async ({ message }) => {
            const screenshot_path = `./failure/${scenario.title}.png` as const;
            try {
              await fs.mkdir("./failure");
            } catch (e) {}

            const screenshot = await context.current.page?.screenshot({
              path: screenshot_path,
            });

            open(screenshot_path);

            onFail({ type: "failure", message, image: screenshot_path });
            if (closeAfterFail) {
              context.current.browser?.close();
            }
          }}
        />
      </>
    );
  } else {
    return <Text>No more steps</Text>;
  }
};
type StepParseResult = ReturnType<typeof findBestStep>;
type ParsedStep = Exclude<StepParseResult, { type: "Err" }>;

const RunStep = ({
  step,
  idx,
  context,
  onSuccess,
  onFail,
  headless,
}: {
  step: ParsedStep;
  idx: number;
  context: Context;
  headless: boolean;
  onSuccess: (res: { type: "success" }) => void;
  onFail: (res: { type: "failure"; message: string }) => void;
}) => {
  useEffect(() => {
    (async () => {
      try {
        await step.execute(context).then((ret) => {
          onSuccess({ type: "success" });
        });
      } catch (e) {
        onFail({ type: "failure", message: (e as Error).message });
      }
    })();
  }, [idx]);
  return <Text></Text>;
};

const ParseResultsDisplay = ({ features }: { features: Feature[] }) => {
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
