import type { BackupEnvironment } from "./backup";

export interface BackupWorkerEnvironment extends BackupEnvironment {
  CONTENT_BACKUP_WORKFLOW: Workflow<unknown>;
}

export function scheduledBackupInstanceId(scheduledTime: number): string {
  if (!Number.isSafeInteger(scheduledTime) || scheduledTime < 0) {
    throw new Error("Scheduled backup time is invalid");
  }
  return `scheduled-${scheduledTime}`;
}

export async function createScheduledBackup(
  env: Pick<BackupWorkerEnvironment, "CONTENT_BACKUP_WORKFLOW">,
  scheduledTime: number,
): Promise<string> {
  const instanceId = scheduledBackupInstanceId(scheduledTime);
  try {
    await env.CONTENT_BACKUP_WORKFLOW.create({ id: instanceId });
  } catch {
    // A Cron Trigger delivery can be retried after create() has succeeded.
    // Confirm the deterministic instance before treating the retry as failed.
    try {
      await env.CONTENT_BACKUP_WORKFLOW.get(instanceId);
    } catch {
      throw new Error("Scheduled backup workflow could not be started");
    }
  }
  return instanceId;
}

export function notFoundResponse(): Response {
  return new Response("Not found", { status: 404 });
}
