import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import {
  backupAsset,
  exportDatabase,
  listAssetInventory,
  storeExport,
  type BackupEnvironment,
} from "./backup";
import { type BackupWorkerEnvironment, createScheduledBackup, notFoundResponse } from "./trigger";

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

    // Starting and collecting the export is one step: the export API drops a
    // finished dump when its polling session closes, so a retry has to start
    // over rather than poll a bookmark from an earlier attempt.
    const { bookmark, location } = await step.do(
      "export the database",
      {
        retries: { limit: 5, delay: "30 seconds", backoff: "exponential" },
        timeout: "5 minutes",
        sensitive: "output",
      },
      async () => exportDatabase(this.env),
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
  async scheduled(controller, env) {
    await createScheduledBackup(env, controller.scheduledTime);
  },
  fetch() {
    return notFoundResponse();
  },
} satisfies ExportedHandler<BackupWorkerEnvironment>;
