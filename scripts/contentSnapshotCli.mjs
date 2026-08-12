import { writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ContentCiClient,
  createCandidate,
  materializeSnapshot,
  publicationInputSnapshot,
  sanitizedSnapshotMetadata,
} from "./contentSnapshotClient.mjs";

function parseArgs(argv) {
  const [command, ...tokens] = argv;
  const values = {};
  for (let index = 0; index < tokens.length; index += 2) {
    const name = tokens[index];
    const value = tokens[index + 1];
    if (!name?.startsWith("--") || value === undefined) {
      throw new Error("Arguments must use --name value pairs");
    }
    values[name.slice(2)] = value;
  }
  return { command, values };
}

function required(values, name) {
  const value = String(values[name] || "").trim();
  if (!value) throw new Error(`--${name} is required`);
  return value;
}

function absolutePath(values, name) {
  const value = required(values, name);
  if (!isAbsolute(value)) throw new Error(`--${name} must be an absolute path`);
  return resolve(value);
}

function writeResult(values, result) {
  const output = absolutePath(values, "output");
  writeFileSync(output, `${JSON.stringify(result)}\n`, { flag: "w", mode: 0o600 });
}

async function main(argv = process.argv.slice(2), client = new ContentCiClient()) {
  const { command, values } = parseArgs(argv);
  if (command === "running") {
    const result = await client.running(required(values, "job-id"), required(values, "run-id"));
    writeResult(values, {
      jobId: result.job?.id || result.id,
      state: result.job?.state || result.state,
    });
    return;
  }
  if (command === "download-job") {
    const jobSnapshot = await client.jobSnapshot(required(values, "job-id"));
    const input = await publicationInputSnapshot(jobSnapshot, client);
    const counts = await materializeSnapshot(input.snapshot, absolutePath(values, "root"), {
      client,
    });
    writeResult(values, {
      ...sanitizedSnapshotMetadata(input.snapshot, input),
      ...counts,
    });
    return;
  }
  if (command === "candidate") {
    const result = await createCandidate(
      required(values, "job-id"),
      absolutePath(values, "root"),
      required(values, "code-sha"),
      { client },
    );
    writeResult(values, {
      jobId: result.job?.id || "",
      releaseId: result.release?.id || "",
      state: result.release?.state || "",
    });
    return;
  }
  if (command === "download-release") {
    const releaseId = required(values, "release-id");
    const snapshot =
      releaseId === "active"
        ? await client.activeReleaseSnapshot()
        : await client.releaseSnapshot(releaseId);
    const counts = await materializeSnapshot(snapshot, absolutePath(values, "root"), { client });
    writeResult(values, { ...sanitizedSnapshotMetadata(snapshot), ...counts });
    return;
  }
  if (command === "deploying") {
    const result = await client.deploying(
      required(values, "job-id"),
      required(values, "release-id"),
    );
    writeResult(values, { releaseId: result.release?.id || result.id || "", state: "deploying" });
    return;
  }
  if (command === "finalize") {
    const result = await client.finalize(
      required(values, "job-id"),
      required(values, "release-id"),
      required(values, "pages-deployment-id"),
    );
    writeResult(values, { releaseId: result.release?.id || result.id || "", state: "active" });
    return;
  }
  if (command === "fail") {
    const result = await client.fail(
      required(values, "job-id"),
      required(values, "sanitized-error"),
    );
    writeResult(values, { jobId: result.job?.id || result.id || "", state: "failed" });
    return;
  }
  if (command === "pending") {
    const result = await client.pendingReleases();
    const releases = Array.isArray(result.releases) ? result.releases : result.items || [];
    writeResult(values, {
      releases: releases.map((release) => ({
        id: release.id,
        state: release.state,
        publishJobId: release.publishJobId || "",
      })),
    });
    return;
  }
  if (command === "reconcile") {
    const result = await client.reconcile(
      required(values, "release-id"),
      required(values, "pages-deployment-id"),
    );
    writeResult(values, {
      jobId: result.job?.id || "",
      releaseId: result.release?.id || result.id || "",
      state: "active",
    });
    return;
  }
  throw new Error(`Unknown content snapshot command: ${command || "(missing)"}`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    // Never include API bodies or local source in this CLI's error output. The
    // API client already reduces remote failures to a status and error code.
    console.error(`${error.name || "Error"}: ${error.message}`);
    process.exitCode = 1;
  });
}

export { main };
