import { runFeature, type RunnerUpdate } from "./index";
import { getAllFeatures } from "../feature-parser/loadFeatures";

// Example usage of the runner module
async function example() {
  try {
    // Load features
    const { features } = await getAllFeatures();

    // Get the first feature
    const feature = features[0];
    if (!feature) {
      console.log("No features found");
      return;
    }

    console.log(`Running feature: ${feature.title}`);

    // Run the feature with progress updates
    const result = await runFeature(feature, {
      headless: true,
      closeAfterFail: true,
      onUpdate: (update: RunnerUpdate) => {
        switch (update.type) {
          case "scenario_started":
            console.log(`  Starting scenario: ${update.scenarioTitle}`);
            break;
          case "step_started":
            console.log(`    Running step: ${update.step}`);
            break;
          case "step_completed":
            console.log(`    ✓ Completed step: ${update.step}`);
            break;
          case "scenario_completed":
            console.log(`  ✓ Completed scenario: ${update.scenarioTitle}`);
            break;
          case "feature_completed":
            console.log(`✓ Feature completed in ${update.duration_ms}ms`);
            break;
        }
      },
    });

    console.log(`Feature completed successfully in ${result.duration_ms}ms`);
  } catch (error) {
    if (error instanceof Error && error.name === "RunnerError") {
      console.error(`Feature failed: ${error.message}`);
      console.error(`Scenario: ${(error as any).scenarioTitle}`);
      console.error(`Step: ${(error as any).step}`);
      if ((error as any).image) {
        console.error(`Screenshot saved: ${(error as any).image}`);
      }
    } else {
      console.error("Unexpected error:", error);
    }
  }
}

// Run the example if this file is executed directly
if (import.meta.main) {
  example();
}
