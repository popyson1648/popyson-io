import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import {
  createScheduledBackup,
  notFoundResponse,
  scheduledBackupInstanceId,
  type BackupWorkerEnvironment,
} from "../src/trigger";

function workflowEnvironment(workflow: Pick<Workflow, "create" | "get">): BackupWorkerEnvironment {
  return {
    CONTENT_BACKUP_WORKFLOW: workflow as Workflow,
  } as BackupWorkerEnvironment;
}

describe("scheduled backup trigger", () => {
  it("uses the scheduled time as a deterministic Workflow instance ID", async () => {
    const create = vi.fn(async () => ({ id: "scheduled-1786558620000" }));
    const get = vi.fn();
    const env = workflowEnvironment({ create, get } as unknown as Workflow);

    await expect(createScheduledBackup(env, 1_786_558_620_000)).resolves.toBe(
      "scheduled-1786558620000",
    );
    expect(create).toHaveBeenCalledWith({ id: "scheduled-1786558620000" });
    expect(get).not.toHaveBeenCalled();
  });

  it("accepts a retained instance when the same Cron delivery is retried", async () => {
    const create = vi.fn().mockRejectedValue(new Error("instance already exists"));
    const get = vi.fn(async () => ({ id: "scheduled-1786558620000" }));
    const env = workflowEnvironment({ create, get } as unknown as Workflow);

    await expect(createScheduledBackup(env, 1_786_558_620_000)).resolves.toBe(
      "scheduled-1786558620000",
    );
    expect(get).toHaveBeenCalledWith("scheduled-1786558620000");
  });

  it("sanitizes a genuine Workflow binding failure", async () => {
    const create = vi.fn().mockRejectedValue(new Error("request exposed private details"));
    const get = vi.fn().mockRejectedValue(new Error("request exposed private details"));
    const env = workflowEnvironment({ create, get } as unknown as Workflow);

    await expect(createScheduledBackup(env, 1_786_558_620_000)).rejects.toThrow(
      "Scheduled backup workflow could not be started",
    );
  });

  it("rejects an invalid scheduled time", () => {
    expect(() => scheduledBackupInstanceId(Number.NaN)).toThrow("Scheduled backup time is invalid");
  });

  it("keeps the Worker HTTP endpoint unavailable", async () => {
    const response = notFoundResponse();

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Not found");
  });
});

describe("backup schedule configuration", () => {
  it("uses the Free-plan Cron Trigger adapter at the original UTC time", async () => {
    const config = JSON.parse(
      await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    );

    expect(config.triggers?.crons).toEqual(["17 18 * * *"]);
    expect(config.workflows).toHaveLength(1);
    expect(config.workflows[0].schedules).toBeUndefined();
  });
});
