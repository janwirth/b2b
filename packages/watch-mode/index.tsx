import fs from "fs/promises";
import React, { useEffect, useRef, useState } from "react";
import { Badge, Spinner, UnorderedList } from "@inkjs/ui";
import Image from "@inkkit/ink-image";
import { Box, render, Text, useApp, useInput } from "ink";
import open from "open";

import type { Context } from "../step-library/steps";
import { ErrorBoundary } from "./functional-error-boundary";
import { parseStep } from "../step-library/steps";
import { getAllFeatures } from "../feature-parser/loadFeatures";

const timeout = (ms: number) => new Promise((res) => setTimeout(res, ms));

const loadFeatures = async () => {
  const features = await getAllFeatures();
  const errs = features.parseResults.filter((x) => x?.type == "Err");
  if (errs.length) {
    const err = `

PARSING OF FOLLOWING STEPS FAILED:

${errs.map((x, idx) => `${idx + 1}. ${x.step}`).join("\n")}
`;
    return { type: "parse-error" as const, message: err };
  } else {
    return { type: "loaded" as const, features };
  }
};
type Feature = Awaited<ReturnType<typeof getAllFeatures>>["features"][number];

const App = () => {
  const [parseResult, setParseResult] = useState<
    Awaited<ReturnType<typeof loadFeatures>> | { type: "pending" }
  >({ type: "pending" });

  useEffect(() => {
    loadFeatures().then(setParseResult);
  }, []);
  if (parseResult.type == "pending") {
    return (
      <Box gap={1}>
        {/* <Spinner></Spinner> */}

        <Text>Loading</Text>
      </Box>
    );
  } else if (parseResult.type == "parse-error") {
    return (
      <Text>
        PARSE Error
        {parseResult.message}
      </Text>
    );
  } else if (parseResult.type == "loaded") {
    return (
      <Runner
        onReloadFeature={() => loadFeatures().then(setParseResult)}
        features={parseResult.features.features}
      ></Runner>
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
  const [focus, setFocus] = useState(0);
  const [featuresToRun, setFeaturesToRun] = useState<string[]>([]);
  const [passedFeatures, setPassedFeatures] = useState<string[]>([]);
  const [failedFeatures, setFailedFeatures] = useState<
    { title: string; message: string; image?: string }[]
  >([]);
  const { exit } = useApp();
  useInput((input, key) => {
    if (input == "r") {
      onReloadFeature();
    }
    if (input == "h") {
      setHeadless(!headless);
    }
    if (input == "c") {
      setCloseAfterFail(!closeAfterFail);
    }
    if (input == "q") {
      exit();
    }
    if (input == "a") {
      setFeaturesToRun(
        features
          .filter((f) => {
            return !f.isSkipped && !passedFeatures.includes(f.title);
          })
          .map((f) => f.title)
      );
    }
    if (key.upArrow) {
      setFocus(Math.max(0, focus - 1));
    }
    if (key.downArrow) {
      setFocus(Math.min(features.length - 1, focus + 1));
    }
    if (key.return) {
      const selected = features[focus]?.title;
      if (selected) {
        setFeaturesToRun([selected, ...featuresToRun]);
        setPassedFeatures(
          [...passedFeatures].filter((feature) => feature != selected)
        );
      }
    }
  });
  const [headless, setHeadless] = useState(true);
  const [closeAfterFail, setCloseAfterFail] = useState(true);
  const runningFeatures = featuresToRun.slice(0, 1);
  return (
    <Box flexDirection="column" gap={2} paddingTop={4} paddingBottom={4}>
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
                  {feature.isSkipped && <Badge color="beige">SKIP</Badge>}
                  <Box flexDirection="column">
                    <Text>{feature.title}</Text>

                    {runningFeatures.includes(feature.title) && (
                      <RunFeature
                        closeAfterFail={closeAfterFail}
                        headless={headless}
                        feature={feature}
                        onFail={({ message, image }) => {
                          setFeaturesToRun(
                            [...featuresToRun].filter((f) => f != feature.title)
                          );

                          setFailedFeatures([
                            ...failedFeatures,
                            { title: feature.title, message, image },
                          ]);
                        }}
                        onPass={() => {
                          setFeaturesToRun(
                            [...featuresToRun].filter((f) => f != feature.title)
                          );
                          setPassedFeatures([...passedFeatures, feature.title]);
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
                <Text>{f.title}</Text>
                <Text>{f.message}</Text>
              </Box>
              <Text>{JSON.stringify(f.image)}</Text>
              {f.image && <Image src={f.image} />}
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
      <Text>Reload Specs [R]</Text>
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
  scenario,
  onComplete,
  onFail,
  headless,
  closeAfterFail,
}: {
  scenario: Scenario;
  onComplete: () => void;
  onFail: (data: { type: "failure"; message: string; image?: string }) => void;
  headless: boolean;
  closeAfterFail: boolean;
}) => {
  const context = useRef<Context>({});
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
    const parsed = parseStep(step);
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
type StepParseResult = ReturnType<typeof parseStep>;
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

export const start_interactive = () => {
  //you need this
  // https://github.com/oven-sh/bun/issues/6862
  process.stdin.resume();
  const app = render(<App />);
  return app.waitUntilExit();
};
