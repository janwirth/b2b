import { test, expect } from "bun:test";
import { getAllFeatures } from "./loadFeatures";

test("All features are parsed", async () => {
  const features = await getAllFeatures();
  expect(features.features.length).toBe(6);
});
