#!/usr/bin/env bun

import { Command } from "commander";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import Bun from "bun";
import { mkdir } from "fs/promises";
import { getAllFeatures } from "./packages/feature-parser/loadFeatures";
import { rm } from "fs/promises";
import chalk from "chalk";
import { start_interactive } from "./packages/watch-mode";

const program = new Command();

// Get version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "package.json"), "utf8")
);

program
  .name("b2b")
  .description("A tool for testing applications")
  .version(packageJson.version || "1.0.0");

import {
  printCheatSheet,
  shutdownBrowsers,
} from "./packages/step-library/steps";
import { runFeature } from "./packages/runner";
import { dir_exists } from "./dir_exists";

program
  .command("init")
  .description("Create feature file directory")
  .option("-f, --force", "Force overwrite of feature file directory")
  .action(async ({ force }) => {
    console.log("Initializing B2B test directory...");
    // TODO: Implement directory creation logic
    if (force) {
      console.log(chalk.yellow("Overwriting feature file directory..."));
      try {
        await rm("./features", { force: true, recursive: true });
      } catch (e) {
        console.error(e);
      }
    }
    const init = async () => {
      if (!(await dir_exists("./features"))) {
        await mkdir("./features");
        await Bun.file("./features/example.feature")
          .writer()
          .write(exampleFeature);
        console.log(
          chalk.green("Feature file directory created successfully!")
        );
      } else {
        console.error(
          "Feature file directory already exists. Use --force to override."
        );
      }
    };
    await init();
  });

const exampleFeature = `
Feature: Example

Scenario: Example
    When I open localhost:3000
    Then I see "Hello, World!"
`;

program
  .command("watch")
  .description("Run in development mode with file watching")
  .action(async () => {
    if (await dir_exists("./features")) {
      await start_interactive();
      await shutdownBrowsers();
    } else {
      console.error(
        "Feature directory not found. Run `b2b init` to create it."
      );
    }
  });
program
  .command("run")
  .description("Run all tests")
  .action(async () => {
    const features = await getAllFeatures();
    for (const feature of features.features) {
      await runFeature(feature, {
        onUpdate: (update) => {
          switch (update.type) {
            case "feature_started":
              console.log(`  Starting feature: ${update.featureTitle}`);
              break;
            case "scenario_started":
              console.log(`  Starting scenario: ${update.scenarioTitle}`);
              break;
            case "step_started":
              console.log(`  Starting step: ${update.step}`);
              break;
            case "step_completed":
              console.log(`  Completed step: ${update.step}`);
              break;
            case "scenario_completed":
              console.log(`  Completed scenario: ${update.scenarioTitle}`);
              break;
          }
        },
      });
    }
  });

program
  .command("cheatsheet")
  .description("Print a cheat sheet of all steps")
  .action(async () => {
    printCheatSheet();
  });
// Default action when no command is specified (equivalent to 'run')
program.action(async () => {
  const features = await getAllFeatures();
  console.log(program.help());
  // TODO: Implement test execution logic
});

program.parse();
