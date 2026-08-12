import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import {
  backupAsset,
  listAssetInventory,
  pollExport,
  startExport,
  storeExport,
  type BackupEnvironment,
} from "./backup";

export class ContentBackupWorkflow extends WorkflowEntrypoint<BackupEnvironment> {
  async run(event: Readonly<WorkflowEvent<unknown>>, step: WorkflowStep) {
    const assets = await step.do(
      "read asset inventory",
      { retries: { limit: 5, delay: "10 seconds", backoff: "exponential" }, sensitive: "output" },
      async () => listAssetInventory(this.env),
    );
    let assetBytes = 0;
    for (const [index, asset] of assets.entries()) {
      const record = await step.do(
        `backup asset ${index + 1} of ${assets.length}`,
        {
          retries: { limit: 5, delay: "30 seconds", backoff: "exponential" },
          sensitive: "output",
        },
        async () => backupAsset(this.env, asset),
      );
      assetBytes += record.bytes;
    }

    const bookmark = await step.do(
      "start D1 export",
      { retries: { limit: 5, delay: "10 seconds", backoff: "exponential" }, sensitive: "output" },
      async () => startExport(this.env),
    );

    const location = await step.do(
      "wait for D1 export",
      {
        retries: { limit: 12, delay: "30 seconds", backoff: "exponential" },
        timeout: "2 minutes",
        sensitive: "output",
      },
      async () => pollExport(this.env, bookmark),
    );

    const record = await step.do(
      "store verified backup",
      {
        retries: { limit: 5, delay: "30 seconds", backoff: "exponential" },
        sensitive: "output",
      },
      async () => storeExport(this.env, location, bookmark, event.timestamp, event.instanceId),
    );

    return {
      assetBytes,
      assets: assets.length,
      databaseBytes: record.bytes,
      databaseSha256: record.sha256,
    };
  }
}

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<BackupEnvironment>;
