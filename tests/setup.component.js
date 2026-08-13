// Setup for the `component` project (happy-dom env).
// Adds jest-dom matchers (toBeInTheDocument, etc.) and unmounts rendered trees
// between tests so they stay isolated.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// happy-dom decodes no images: its createImageBitmap rejects a File outright,
// so the upload path cannot measure a picked file. Reporting a 1x1 image keeps
// prepareImageForUpload on its pass-through branch; the conversion and scaling
// branches are covered by the unit project, which exercises them directly
// rather than through the DOM.
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });

afterEach(() => {
  cleanup();
});
