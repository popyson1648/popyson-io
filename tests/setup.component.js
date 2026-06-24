// Setup for the `component` project (happy-dom env).
// Adds jest-dom matchers (toBeInTheDocument, etc.) and unmounts rendered trees
// between tests so they stay isolated.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
