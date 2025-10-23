import { useState } from "react";
import { useApp, useInput } from "ink";
import type { DecodedFeature } from "../feature-parser/parser-flow";

export type RunnerInputState = {
  focus: number;
  featuresToRun: string[];
  passedFeatures: string[];
  failedFeatures: { title: string; message: string; image?: string }[];
  headless: boolean;
  closeAfterFail: boolean;
};

export type RunnerInputActions = {
  setFocus: (focus: number) => void;
  setFeaturesToRun: (features: string[]) => void;
  setPassedFeatures: (features: string[]) => void;
  setFailedFeatures: (
    features: { title: string; message: string; image?: string }[]
  ) => void;
  setHeadless: (headless: boolean) => void;
  setCloseAfterFail: (closeAfterFail: boolean) => void;
  addFeatureToRun: (featureTitle: string) => void;
  removeFeatureFromRun: (featureTitle: string) => void;
  addPassedFeature: (featureTitle: string) => void;
  addFailedFeature: (feature: {
    title: string;
    message: string;
    image?: string;
  }) => void;
  runAllAvailableFeatures: () => void;
};

export const useRunnerInput = (
  features: DecodedFeature[],
  onReloadFeature: () => void
): RunnerInputState & RunnerInputActions => {
  const [focus, setFocus] = useState(0);
  const [featuresToRun, setFeaturesToRun] = useState<string[]>([]);
  const [passedFeatures, setPassedFeatures] = useState<string[]>([]);
  const [failedFeatures, setFailedFeatures] = useState<
    { title: string; message: string; image?: string }[]
  >([]);
  const [headless, setHeadless] = useState(true);
  const [closeAfterFail, setCloseAfterFail] = useState(true);

  const { exit } = useApp();

  // Action helpers
  const addFeatureToRun = (featureTitle: string) => {
    setFeaturesToRun([featureTitle, ...featuresToRun]);
    setPassedFeatures(
      [...passedFeatures].filter((feature) => feature !== featureTitle)
    );
    setFailedFeatures(
      [...failedFeatures].filter((feature) => feature.title !== featureTitle)
    );
  };

  const removeFeatureFromRun = (featureTitle: string) => {
    setFeaturesToRun([...featuresToRun].filter((f) => f !== featureTitle));
  };

  const addPassedFeature = (featureTitle: string) => {
    setPassedFeatures([...passedFeatures, featureTitle]);
  };

  const addFailedFeature = (feature: {
    title: string;
    message: string;
    image?: string;
  }) => {
    setFailedFeatures([...failedFeatures, feature]);
  };

  const runAllAvailableFeatures = () => {
    setFeaturesToRun(
      features
        .filter((f) => {
          return !f.skipReason && !passedFeatures.includes(f.title);
        })
        .map((f) => f.title)
    );
    setFailedFeatures([]);
  };

  // Keyboard input handling
  useInput((input, key) => {
    if (input === "r") {
      onReloadFeature();
    }
    if (input === "h") {
      setHeadless(!headless);
    }
    if (input === "c") {
      setCloseAfterFail(!closeAfterFail);
    }
    if (input === "q") {
      exit();
    }
    if (input === "a") {
      runAllAvailableFeatures();
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
        addFeatureToRun(selected);
      }
    }
  });

  return {
    // State
    focus,
    featuresToRun,
    passedFeatures,
    failedFeatures,
    headless,
    closeAfterFail,

    // Actions
    setFocus,
    setFeaturesToRun,
    setPassedFeatures,
    setFailedFeatures,
    setHeadless,
    setCloseAfterFail,
    addFeatureToRun,
    removeFeatureFromRun,
    addPassedFeature,
    addFailedFeature,
    runAllAvailableFeatures,
  };
};
