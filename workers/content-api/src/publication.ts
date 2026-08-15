import type { RuntimeEnv } from "./env";
import { HttpError } from "./http";
import {
  createPublicationRevision,
  getItem,
  getRevision,
  getRevisionAssets,
  itemJson,
  revisionJson,
  sha256,
  type ItemRow,
  type RevisionInput,
  type Visibility,
} from "./repository";

type JobState = "queued" | "running" | "failed" | "succeeded";
type ReleaseState = "candidate" | "deploying" | "active" | "failed" | "superseded";

interface PublishJobRow {
  id: string;
  item_id: string;
  revision_id: string;
  expected_revision_id: string | null;
  target_visibility: Visibility | null;
  target_deleted_at: string | null;
  idempotency_key: string;
  state: JobState;
  attempts: number;
  github_run_id: string | null;
  candidate_revision_id: string | null;
  candidate_checksum: string | null;
  release_id: string | null;
  expected_base_release_id: string | null;
  batch_mode: number;
  sanitized_error: string | null;
  created_at: string;
  updated_at: string;
}

interface PublishJobItemRow {
  job_id: string;
  item_id: string;
  revision_id: string;
  expected_revision_id: string;
  target_visibility: Visibility;
  target_deleted_at: string | null;
  candidate_revision_id: string | null;
  candidate_checksum: string | null;
}

interface ReleaseRow {
  id: string;
  code_sha: string;
  state: ReleaseState;
  manifest_checksum: string;
  pages_deployment_id: string | null;
  publish_job_id: string | null;
  base_release_id: string | null;
  created_at: string;
  activated_at: string | null;
}

interface ReleaseItemRow extends ItemRow {
  revision_id: string;
}

export interface CandidateInput {
  codeSha?: string;
  revision?: RevisionInput;
  assets?: Array<{ assetId?: string; logicalPath?: string; role?: string }>;
  items?: Array<{
    itemId?: string;
    revision?: RevisionInput;
    assets?: Array<{ assetId?: string; logicalPath?: string; role?: string }>;
  }>;
}

function jobJson(row: PublishJobRow) {
  return {
    id: row.id,
    itemId: row.item_id,
    revisionId: row.revision_id,
    expectedRevisionId: row.expected_revision_id,
    targetVisibility: row.target_visibility,
    targetDeletedAt: row.target_deleted_at,
    state: row.state,
    attempts: row.attempts,
    githubRunId: row.github_run_id,
    candidateRevisionId: row.candidate_revision_id,
    releaseId: row.release_id,
    sanitizedError: row.sanitized_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function releaseJson(row: ReleaseRow) {
  return {
    id: row.id,
    codeSha: row.code_sha,
    state: row.state,
    manifestChecksum: row.manifest_checksum,
    pagesDeploymentId: row.pages_deployment_id,
    publishJobId: row.publish_job_id,
    baseReleaseId: row.base_release_id,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

async function getJob(env: RuntimeEnv, jobId: string): Promise<PublishJobRow> {
  if (!/^[0-9a-f-]{36}$/.test(jobId)) {
    throw new HttpError(404, "not_found", "Publication job was not found");
  }
  const job = await env.CONTENT_DB.prepare("SELECT * FROM publish_jobs WHERE id = ?1")
    .bind(jobId)
    .first<PublishJobRow>();
  if (!job) throw new HttpError(404, "not_found", "Publication job was not found");
  return job;
}

async function getJobItems(env: RuntimeEnv, jobId: string): Promise<PublishJobItemRow[]> {
  const rows = await env.CONTENT_DB.prepare(
    "SELECT * FROM publish_job_items WHERE job_id = ?1 ORDER BY item_id",
  )
    .bind(jobId)
    .all<PublishJobItemRow>();
  return rows.results;
}

async function getItemById(env: RuntimeEnv, itemId: string): Promise<ItemRow> {
  const item = await env.CONTENT_DB.prepare(
    `SELECT id, kind, slug, visibility, deleted_at, current_revision_id,
            published_revision_id, created_at, updated_at
       FROM content_items WHERE id = ?1`,
  )
    .bind(itemId)
    .first<ItemRow>();
  if (!item) throw new HttpError(500, "missing_item", "Publication item was not found");
  return item;
}

async function getRelease(env: RuntimeEnv, releaseId: string): Promise<ReleaseRow> {
  if (!/^[0-9a-f-]{36}$/.test(releaseId)) {
    throw new HttpError(404, "not_found", "Release was not found");
  }
  const release = await env.CONTENT_DB.prepare("SELECT * FROM releases WHERE id = ?1")
    .bind(releaseId)
    .first<ReleaseRow>();
  if (!release) throw new HttpError(404, "not_found", "Release was not found");
  return release;
}

async function activeRelease(env: RuntimeEnv): Promise<ReleaseRow | null> {
  return env.CONTENT_DB.prepare(
    "SELECT * FROM releases WHERE state = 'active'",
  ).first<ReleaseRow>();
}

export async function createPublishJob(
  env: RuntimeEnv,
  kindValue: string,
  slug: string,
  input: { revisionId?: string; idempotencyKey?: string },
) {
  const item = await getItem(env, kindValue, slug);
  const revisionId = String(input.revisionId || "");
  const idempotencyKey = String(input.idempotencyKey || "");
  if (revisionId !== item.current_revision_id) {
    throw new HttpError(409, "revision_conflict", "Only the current revision can be published");
  }
  await getRevision(env, revisionId, item.id);
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
    throw new HttpError(400, "invalid_idempotency_key", "Idempotency key is invalid");
  }
  const existing = await env.CONTENT_DB.prepare(
    "SELECT * FROM publish_jobs WHERE idempotency_key = ?1",
  )
    .bind(idempotencyKey)
    .first<PublishJobRow>();
  if (existing) {
    const sameIntent =
      existing.item_id === item.id &&
      existing.revision_id === revisionId &&
      existing.target_visibility === item.visibility &&
      existing.target_deleted_at === item.deleted_at;
    if (!sameIntent) {
      throw new HttpError(409, "idempotency_conflict", "Idempotency key was already used");
    }
    return { job: jobJson(existing) };
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  try {
    const created = await env.CONTENT_DB.prepare(
      `INSERT INTO publish_jobs
        (id, item_id, revision_id, expected_revision_id, target_visibility,
         target_deleted_at, idempotency_key, state, created_at, updated_at)
       SELECT ?1, i.id, ?3, ?3, i.visibility, i.deleted_at, ?4, 'queued', ?5, ?5
         FROM content_items i
        WHERE i.id = ?2 AND i.current_revision_id = ?3`,
    )
      .bind(id, item.id, revisionId, idempotencyKey, now)
      .run();
    if (created.meta.changes !== 1) {
      throw new HttpError(409, "revision_conflict", "Content changed before publication started");
    }
    await env.CONTENT_DB.prepare(
      `INSERT INTO publish_job_items
        (job_id, item_id, revision_id, expected_revision_id, target_visibility, target_deleted_at)
       VALUES (?1, ?2, ?3, ?3, ?4, ?5)`,
    )
      .bind(id, item.id, revisionId, item.visibility, item.deleted_at)
      .run();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (String(error).includes("UNIQUE")) {
      throw new HttpError(409, "idempotency_conflict", "Idempotency key was already used");
    }
    throw error;
  }
  return { job: jobJson(await getJob(env, id)) };
}

interface PendingRow extends ItemRow {
  release_revision_id: string | null;
  metadata_json: string;
}

async function pendingRows(
  env: RuntimeEnv,
): Promise<{ releaseId: string | null; rows: PendingRow[] }> {
  const release = await activeRelease(env);
  const result = await env.CONTENT_DB.prepare(
    `SELECT i.id, i.kind, i.slug, i.visibility, i.deleted_at, i.current_revision_id,
            i.published_revision_id, i.created_at, i.updated_at,
            ri.revision_id AS release_revision_id, r.metadata_json
       FROM content_items i
       JOIN content_revisions r ON r.id = i.current_revision_id
       LEFT JOIN release_items ri ON ri.item_id = i.id AND ri.release_id IS ?1
      WHERE (i.visibility = 'public' AND i.deleted_at IS NULL
             AND (ri.revision_id IS NULL OR ri.revision_id != i.current_revision_id))
         OR ((i.visibility = 'private' OR i.deleted_at IS NOT NULL) AND ri.revision_id IS NOT NULL)
      ORDER BY i.kind, i.slug`,
  )
    .bind(release?.id ?? null)
    .all<PendingRow>();
  return { releaseId: release?.id ?? null, rows: result.results };
}

function displayTitle(row: PendingRow): string {
  try {
    const metadata = JSON.parse(row.metadata_json) as Record<string, unknown>;
    const files = (metadata.documents as Record<string, unknown> | undefined)?.files;
    void files;
  } catch {
    // Slug remains a safe, non-source fallback.
  }
  return row.kind === "about" ? "About" : row.slug;
}

async function intentChecksum(releaseId: string | null, rows: PendingRow[]): Promise<string> {
  return sha256(
    canonicalJson({
      releaseId,
      items: rows.map((row) => [
        row.id,
        row.current_revision_id,
        row.visibility,
        row.deleted_at,
        row.release_revision_id,
      ]),
    }),
  );
}

export async function publicationPreflight(env: RuntimeEnv) {
  const { releaseId, rows } = await pendingRows(env);
  return {
    releaseId,
    intentChecksum: await intentChecksum(releaseId, rows),
    items: rows.map((row) => ({
      ...itemJson(row),
      title: displayTitle(row),
      action:
        row.visibility !== "public" || row.deleted_at
          ? row.deleted_at
            ? "delete"
            : "make_private"
          : row.release_revision_id
            ? "update"
            : "add",
      valid: Boolean(row.current_revision_id),
    })),
  };
}

export async function createBatchPublishJob(
  env: RuntimeEnv,
  input: { intentChecksum?: string; idempotencyKey?: string },
) {
  const expected = String(input.intentChecksum || "");
  const idempotencyKey = String(input.idempotencyKey || "");
  if (!/^[a-f0-9]{64}$/.test(expected)) {
    throw new HttpError(400, "invalid_intent_checksum", "Publication preflight is invalid");
  }
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
    throw new HttpError(400, "invalid_idempotency_key", "Idempotency key is invalid");
  }
  const existing = await env.CONTENT_DB.prepare(
    "SELECT * FROM publish_jobs WHERE idempotency_key = ?1",
  )
    .bind(idempotencyKey)
    .first<PublishJobRow>();
  if (existing) return { job: jobJson(existing) };
  const { releaseId, rows } = await pendingRows(env);
  if ((await intentChecksum(releaseId, rows)) !== expected) {
    throw new HttpError(409, "preflight_conflict", "Saved content changed; refresh publication");
  }
  if (rows.length === 0) return { job: null, noChanges: true };
  const anchor = rows[0];
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const statements = [
    env.CONTENT_DB.prepare(
      `INSERT INTO publish_jobs
        (id, item_id, revision_id, expected_revision_id, target_visibility,
         target_deleted_at, idempotency_key, state, expected_base_release_id,
         batch_mode, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?3, ?4, ?5, ?6, 'queued', ?7, 1, ?8, ?8)`,
    ).bind(
      id,
      anchor.id,
      anchor.current_revision_id,
      anchor.visibility,
      anchor.deleted_at,
      idempotencyKey,
      releaseId,
      now,
    ),
    ...rows.map((row) =>
      env.CONTENT_DB.prepare(
        `INSERT INTO publish_job_items
          (job_id, item_id, revision_id, expected_revision_id, target_visibility, target_deleted_at)
         SELECT ?1, id, current_revision_id, current_revision_id, visibility, deleted_at
           FROM content_items
          WHERE id = ?2 AND current_revision_id = ?3 AND visibility = ?4
            AND deleted_at IS ?5`,
      ).bind(id, row.id, row.current_revision_id, row.visibility, row.deleted_at),
    ),
  ];
  const results = await env.CONTENT_DB.batch(statements);
  if (results.some((result) => result.meta.changes !== 1)) {
    throw new HttpError(409, "preflight_conflict", "Saved content changed; refresh publication");
  }
  return { job: jobJson(await getJob(env, id)), noChanges: false };
}

export async function readPublishJob(env: RuntimeEnv, jobId: string) {
  return { job: jobJson(await getJob(env, jobId)) };
}

export async function markJobRunning(
  env: RuntimeEnv,
  jobId: string,
  input: { githubRunId?: string | number },
) {
  const job = await getJob(env, jobId);
  const githubRunId = String(input.githubRunId || "");
  if (!/^\d{1,20}$/.test(githubRunId)) {
    throw new HttpError(400, "invalid_run_id", "GitHub run id is invalid");
  }
  if (job.state === "succeeded") {
    throw new HttpError(409, "job_completed", "Publication job already succeeded");
  }
  if (job.state === "running") {
    if (job.github_run_id !== githubRunId) {
      throw new HttpError(409, "job_running", "Publication job is running in another run");
    }
    return { job: jobJson(job) };
  }
  const now = new Date().toISOString();
  const result = await env.CONTENT_DB.prepare(
    `UPDATE publish_jobs
        SET state = 'running', attempts = attempts + 1, github_run_id = ?1,
            sanitized_error = NULL, updated_at = ?2
      WHERE id = ?3 AND state IN ('queued', 'failed')`,
  )
    .bind(githubRunId, now, job.id)
    .run();
  if (result.meta.changes !== 1) {
    throw new HttpError(409, "job_state_conflict", "Publication job state changed");
  }
  return { job: jobJson(await getJob(env, job.id)) };
}

export async function publicationJobSnapshot(env: RuntimeEnv, jobId: string) {
  const job = await getJob(env, jobId);
  const jobItems = await getJobItems(env, job.id);
  const entries = [];
  for (const pinned of jobItems) {
    const item = await getItemById(env, pinned.item_id);
    const revision = await getRevision(env, pinned.revision_id, item.id);
    const candidateRevisionId =
      pinned.candidate_revision_id || (jobItems.length === 1 ? job.candidate_revision_id : null);
    const candidateRevision = candidateRevisionId
      ? await getRevision(env, candidateRevisionId, item.id)
      : null;
    entries.push({
      item: {
        ...itemJson(item),
        visibility: pinned.target_visibility,
        deletedAt: pinned.target_deleted_at,
      },
      revision: revisionJson(revision),
      assets: await getRevisionAssets(env, revision.id),
      candidate: candidateRevision
        ? {
            revision: revisionJson(candidateRevision),
            assets: await getRevisionAssets(env, candidateRevision.id),
          }
        : undefined,
    });
  }
  if (entries.length !== 1) return { job: jobJson(job), items: entries };
  const [entry] = entries;
  return {
    job: jobJson(job),
    ...entry,
  };
}

async function ensureCandidateRevision(
  env: RuntimeEnv,
  job: PublishJobRow,
  item: ItemRow,
  input: CandidateInput,
  candidateChecksum: string,
): Promise<string> {
  let lockedJob = job;
  if (!lockedJob.candidate_checksum) {
    await env.CONTENT_DB.prepare(
      `UPDATE publish_jobs SET candidate_checksum = ?1, updated_at = ?2
        WHERE id = ?3 AND state = 'running' AND candidate_checksum IS NULL`,
    )
      .bind(candidateChecksum, new Date().toISOString(), lockedJob.id)
      .run();
    lockedJob = await getJob(env, lockedJob.id);
  }
  if (lockedJob.candidate_checksum !== candidateChecksum) {
    throw new HttpError(409, "candidate_conflict", "Candidate payload changed");
  }
  if (lockedJob.candidate_revision_id) return lockedJob.candidate_revision_id;
  let candidateRevisionId = lockedJob.revision_id;
  if (input.revision || input.assets !== undefined) {
    let revisionInput = input.revision;
    if (!revisionInput) {
      const pinned = await getRevision(env, lockedJob.revision_id, item.id);
      revisionInput = {
        sourceJa: pinned.source_ja,
        sourceEn: pinned.source_en,
        documents: JSON.parse(pinned.documents_json) as unknown,
        metadata: JSON.parse(pinned.metadata_json) as unknown,
        expectedRevisionId: lockedJob.revision_id,
        createdBy: "ci-publication",
      };
    }
    try {
      candidateRevisionId = await createPublicationRevision(
        env,
        item,
        lockedJob.revision_id,
        revisionInput,
        input.assets,
        lockedJob.id,
      );
    } catch (error) {
      if (!String(error).includes("UNIQUE")) throw error;
      await getRevision(env, lockedJob.id, item.id);
      candidateRevisionId = lockedJob.id;
    }
  }
  const result = await env.CONTENT_DB.prepare(
    `UPDATE publish_jobs
        SET candidate_revision_id = ?1, updated_at = ?2
      WHERE id = ?3 AND state = 'running' AND candidate_checksum = ?4
        AND candidate_revision_id IS NULL`,
  )
    .bind(candidateRevisionId, new Date().toISOString(), lockedJob.id, candidateChecksum)
    .run();
  if (result.meta.changes !== 1) {
    const current = await getJob(env, lockedJob.id);
    if (
      current.candidate_checksum !== candidateChecksum ||
      current.candidate_revision_id !== candidateRevisionId
    ) {
      throw new HttpError(409, "candidate_conflict", "Candidate was created concurrently");
    }
  }
  return candidateRevisionId;
}

async function releaseManifest(
  env: RuntimeEnv,
  base: ReleaseRow | null,
  changes: Array<{
    itemId: string;
    visibility: Visibility;
    deletedAt: string | null;
    revisionId: string;
  }>,
  seedCurrentWhenNoBase: boolean,
): Promise<Map<string, string>> {
  const manifest = new Map<string, string>();
  if (base) {
    const rows = await env.CONTENT_DB.prepare(
      "SELECT item_id, revision_id FROM release_items WHERE release_id = ?1 ORDER BY item_id",
    )
      .bind(base.id)
      .all<{ item_id: string; revision_id: string }>();
    for (const row of rows.results) manifest.set(row.item_id, row.revision_id);
  } else if (seedCurrentWhenNoBase) {
    const rows = await env.CONTENT_DB.prepare(
      `SELECT id AS item_id, current_revision_id AS revision_id
         FROM content_items
        WHERE visibility = 'public' AND deleted_at IS NULL AND current_revision_id IS NOT NULL
        ORDER BY id`,
    ).all<{ item_id: string; revision_id: string }>();
    for (const row of rows.results) manifest.set(row.item_id, row.revision_id);
  }
  for (const change of changes) {
    if (change.visibility === "public" && change.deletedAt === null) {
      manifest.set(change.itemId, change.revisionId);
    } else {
      manifest.delete(change.itemId);
    }
  }
  return manifest;
}

export async function createCandidateRelease(
  env: RuntimeEnv,
  jobId: string,
  input: CandidateInput,
) {
  let job = await getJob(env, jobId);
  if (job.state !== "running") {
    throw new HttpError(409, "job_not_running", "Publication job must be running");
  }
  const codeSha = String(input.codeSha || "");
  if (!/^[a-f0-9]{40,64}$/.test(codeSha)) {
    throw new HttpError(400, "invalid_code_sha", "Code SHA is invalid");
  }
  if (input.assets !== undefined && !Array.isArray(input.assets)) {
    throw new HttpError(400, "invalid_assets", "Candidate assets must be an array");
  }
  const orderedAssets = input.assets
    ? [...input.assets].sort((left, right) =>
        String(left.logicalPath || "").localeCompare(String(right.logicalPath || "")),
      )
    : undefined;
  const orderedItems = input.items
    ? input.items
        .map((entry) => ({
          ...entry,
          assets: entry.assets
            ? [...entry.assets].sort((left, right) =>
                String(left.logicalPath || "").localeCompare(String(right.logicalPath || "")),
              )
            : undefined,
        }))
        .sort((left, right) => String(left.itemId || "").localeCompare(String(right.itemId || "")))
    : undefined;
  const normalizedInput = { ...input, assets: orderedAssets, items: orderedItems };
  const candidateChecksum = await sha256(
    canonicalJson({
      codeSha,
      revision: input.revision ?? null,
      assets: orderedAssets ?? null,
      items: orderedItems ?? null,
    }),
  );
  const pinnedItems = await getJobItems(env, job.id);
  const changes: Array<{
    itemId: string;
    visibility: Visibility;
    deletedAt: string | null;
    revisionId: string;
  }> = [];
  if (pinnedItems.length === 1 && !input.items) {
    const item = await getItemById(env, job.item_id);
    const candidateRevisionId = await ensureCandidateRevision(
      env,
      job,
      item,
      normalizedInput,
      candidateChecksum,
    );
    changes.push({
      itemId: job.item_id,
      visibility: job.target_visibility as Visibility,
      deletedAt: job.target_deleted_at,
      revisionId: candidateRevisionId,
    });
  } else {
    const candidates = new Map(
      (orderedItems || []).map((entry) => [String(entry.itemId || ""), entry]),
    );
    for (const pinned of pinnedItems) {
      const item = await getItemById(env, pinned.item_id);
      let revisionId = pinned.candidate_revision_id || pinned.revision_id;
      if (pinned.target_visibility === "public" && pinned.target_deleted_at === null) {
        const candidate = candidates.get(pinned.item_id);
        if (!candidate)
          throw new HttpError(400, "missing_candidate", "Public batch item candidate is missing");
        if (!pinned.candidate_revision_id) {
          revisionId = await createPublicationRevision(
            env,
            item,
            pinned.revision_id,
            candidate.revision || {
              sourceJa: (await getRevision(env, pinned.revision_id, item.id)).source_ja,
              sourceEn: (await getRevision(env, pinned.revision_id, item.id)).source_en,
              documents: JSON.parse(
                (await getRevision(env, pinned.revision_id, item.id)).documents_json,
              ),
              expectedRevisionId: pinned.revision_id,
            },
            candidate.assets,
          );
          await env.CONTENT_DB.prepare(
            `UPDATE publish_job_items SET candidate_revision_id = ?1, candidate_checksum = ?2
              WHERE job_id = ?3 AND item_id = ?4 AND candidate_revision_id IS NULL`,
          )
            .bind(revisionId, candidateChecksum, job.id, pinned.item_id)
            .run();
        }
      }
      changes.push({
        itemId: pinned.item_id,
        visibility: pinned.target_visibility,
        deletedAt: pinned.target_deleted_at,
        revisionId,
      });
    }
    await env.CONTENT_DB.prepare(
      `UPDATE publish_jobs SET candidate_checksum = ?1, updated_at = ?2
        WHERE id = ?3 AND state = 'running' AND candidate_checksum IS NULL`,
    )
      .bind(candidateChecksum, new Date().toISOString(), job.id)
      .run();
    job = await getJob(env, job.id);
    if (job.candidate_checksum !== candidateChecksum) {
      throw new HttpError(409, "candidate_conflict", "Candidate payload changed");
    }
  }
  job = await getJob(env, job.id);
  const base = await activeRelease(env);
  if (job.batch_mode === 1 && job.expected_base_release_id !== (base?.id ?? null)) {
    throw new HttpError(409, "release_stale", "Active release changed after publication preflight");
  }
  if (job.release_id) {
    const existing = await getRelease(env, job.release_id);
    if (existing.state === "active") {
      return { job: jobJson(job), release: releaseJson(existing) };
    }
    if (
      (existing.state === "candidate" || existing.state === "deploying") &&
      existing.base_release_id === (base?.id ?? null)
    ) {
      return { job: jobJson(job), release: releaseJson(existing) };
    }
    await env.CONTENT_DB.prepare(
      `UPDATE releases SET state = 'superseded'
        WHERE id = ?1 AND state IN ('candidate', 'deploying', 'failed')`,
    )
      .bind(existing.id)
      .run();
  }
  const manifest = await releaseManifest(env, base, changes, job.batch_mode !== 1);
  const entries = [...manifest.entries()].sort(([left], [right]) => left.localeCompare(right));
  const manifestChecksum = await sha256(canonicalJson(entries));
  const releaseId = crypto.randomUUID();
  const now = new Date().toISOString();
  const expectedReleaseId = job.release_id;
  const statements = [
    env.CONTENT_DB.prepare(
      `INSERT INTO releases
        (id, code_sha, state, manifest_checksum, publish_job_id, base_release_id, created_at)
       SELECT ?1, ?2, 'candidate', ?3, ?4, ?5, ?6
        WHERE EXISTS (
          SELECT 1 FROM publish_jobs
           WHERE id = ?4 AND state = 'running' AND release_id IS ?7
        )`,
    ).bind(releaseId, codeSha, manifestChecksum, job.id, base?.id ?? null, now, expectedReleaseId),
    ...entries.map(([itemId, revisionId]) =>
      env.CONTENT_DB.prepare(
        `INSERT INTO release_items (release_id, item_id, revision_id)
         SELECT ?1, ?2, ?3 WHERE EXISTS (SELECT 1 FROM releases WHERE id = ?1)`,
      ).bind(releaseId, itemId, revisionId),
    ),
    env.CONTENT_DB.prepare(
      `UPDATE publish_jobs SET release_id = ?1, updated_at = ?2
        WHERE id = ?3 AND state = 'running' AND release_id IS ?4`,
    ).bind(releaseId, now, job.id, expectedReleaseId),
  ];
  const results = await env.CONTENT_DB.batch(statements);
  if (results[0].meta.changes !== 1 || results.at(-1)?.meta.changes !== 1) {
    const current = await getJob(env, job.id);
    if (current.release_id) {
      const concurrent = await getRelease(env, current.release_id);
      if (
        current.candidate_checksum === candidateChecksum &&
        concurrent.base_release_id === (base?.id ?? null) &&
        (concurrent.state === "candidate" || concurrent.state === "deploying")
      ) {
        return { job: jobJson(current), release: releaseJson(concurrent) };
      }
    }
    throw new HttpError(409, "job_state_conflict", "Publication job state changed");
  }
  job = await getJob(env, job.id);
  return { job: jobJson(job), release: releaseJson(await getRelease(env, releaseId)) };
}

export async function markReleaseDeploying(
  env: RuntimeEnv,
  jobId: string,
  input: { releaseId?: string },
) {
  const job = await getJob(env, jobId);
  const releaseId = String(input.releaseId || "");
  if (job.release_id !== releaseId || job.state !== "running") {
    throw new HttpError(409, "release_conflict", "Release does not belong to the running job");
  }
  const release = await getRelease(env, releaseId);
  if (release.state !== "candidate" && release.state !== "deploying") {
    throw new HttpError(409, "release_state_conflict", "Release cannot be deployed");
  }
  const active = await activeRelease(env);
  if (release.base_release_id !== (active?.id ?? null)) {
    throw new HttpError(409, "release_stale", "Candidate release must be rebuilt from active");
  }
  if (release.state === "candidate") {
    await env.CONTENT_DB.prepare("UPDATE releases SET state = 'deploying' WHERE id = ?1")
      .bind(release.id)
      .run();
  }
  return {
    job: jobJson(await getJob(env, job.id)),
    release: releaseJson(await getRelease(env, release.id)),
  };
}

function validDeploymentId(value: string): boolean {
  return /^[A-Za-z0-9._-]{1,128}$/.test(value);
}

async function activateRelease(
  env: RuntimeEnv,
  job: PublishJobRow,
  release: ReleaseRow,
  pagesDeploymentId: string,
) {
  if (!validDeploymentId(pagesDeploymentId)) {
    throw new HttpError(400, "invalid_deployment_id", "Pages deployment id is invalid");
  }
  if (release.state === "active") {
    if (release.pages_deployment_id !== pagesDeploymentId) {
      throw new HttpError(409, "deployment_conflict", "Release has another deployment id");
    }
    return { job: jobJson(await getJob(env, job.id)), release: releaseJson(release) };
  }
  if (release.state !== "candidate" && release.state !== "deploying") {
    throw new HttpError(409, "release_state_conflict", "Release cannot be activated");
  }
  const active = await activeRelease(env);
  if (release.base_release_id !== (active?.id ?? null)) {
    throw new HttpError(409, "release_stale", "Candidate release must be rebuilt from active");
  }
  const now = new Date().toISOString();
  const statements = [];
  if (active) {
    statements.push(
      env.CONTENT_DB.prepare(
        "UPDATE releases SET state = 'superseded' WHERE id = ?1 AND state = 'active'",
      ).bind(active.id),
    );
  }
  statements.push(
    env.CONTENT_DB.prepare(
      `UPDATE releases
          SET state = 'active', pages_deployment_id = ?1, activated_at = ?2
        WHERE id = ?3 AND state IN ('candidate', 'deploying')`,
    ).bind(pagesDeploymentId, now, release.id),
    env.CONTENT_DB.prepare(
      `UPDATE publish_jobs
          SET state = 'succeeded', sanitized_error = NULL, updated_at = ?1
        WHERE id = ?2 AND release_id = ?3 AND state IN ('running', 'failed')`,
    ).bind(now, job.id, release.id),
    env.CONTENT_DB.prepare(
      `UPDATE content_items
          SET published_revision_id = (
                SELECT revision_id FROM release_items
                 WHERE release_id = ?1 AND item_id = content_items.id
              ),
              updated_at = CASE WHEN id = ?2 THEN ?3 ELSE updated_at END`,
    ).bind(release.id, job.item_id, now),
  );
  const results = await env.CONTENT_DB.batch(statements);
  if (results.at(active ? 1 : 0)?.meta.changes !== 1) {
    throw new HttpError(409, "release_state_conflict", "Release state changed");
  }
  return {
    job: jobJson(await getJob(env, job.id)),
    release: releaseJson(await getRelease(env, release.id)),
  };
}

export async function finalizePublication(
  env: RuntimeEnv,
  jobId: string,
  input: { releaseId?: string; pagesDeploymentId?: string },
) {
  const job = await getJob(env, jobId);
  const releaseId = String(input.releaseId || "");
  if (job.release_id !== releaseId) {
    throw new HttpError(409, "release_conflict", "Release does not belong to publication job");
  }
  return activateRelease(
    env,
    job,
    await getRelease(env, releaseId),
    String(input.pagesDeploymentId || ""),
  );
}

export async function failPublication(
  env: RuntimeEnv,
  jobId: string,
  input: { sanitizedError?: string },
) {
  const job = await getJob(env, jobId);
  const sanitizedError = String(input.sanitizedError || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, 240);
  if (!sanitizedError) {
    throw new HttpError(400, "invalid_error", "Sanitized error summary is required");
  }
  if (job.state === "succeeded") {
    throw new HttpError(409, "job_completed", "Publication job already succeeded");
  }
  if (job.state === "failed" && job.sanitized_error === sanitizedError) {
    return { job: jobJson(job) };
  }
  const result = await env.CONTENT_DB.prepare(
    `UPDATE publish_jobs SET state = 'failed', sanitized_error = ?1, updated_at = ?2
      WHERE id = ?3 AND state IN ('queued', 'running', 'failed')`,
  )
    .bind(sanitizedError, new Date().toISOString(), job.id)
    .run();
  if (result.meta.changes !== 1) {
    throw new HttpError(409, "job_state_conflict", "Publication job state changed");
  }
  return { job: jobJson(await getJob(env, job.id)) };
}

export async function releaseSnapshot(env: RuntimeEnv, releaseId: string) {
  const release = await getRelease(env, releaseId);
  const rows = await env.CONTENT_DB.prepare(
    `SELECT i.id, i.kind, i.slug, i.visibility, i.deleted_at, i.current_revision_id,
            i.published_revision_id, i.created_at, i.updated_at, ri.revision_id
       FROM release_items ri JOIN content_items i ON i.id = ri.item_id
      WHERE ri.release_id = ?1 ORDER BY i.kind, i.slug`,
  )
    .bind(release.id)
    .all<ReleaseItemRow>();
  const items = [];
  for (const row of rows.results) {
    const revision = await getRevision(env, row.revision_id, row.id);
    items.push({
      item: { ...itemJson(row), visibility: "public", deletedAt: null },
      revision: revisionJson(revision),
      assets: await getRevisionAssets(env, revision.id),
    });
  }
  return { release: releaseJson(release), items };
}

export async function activeReleaseSnapshot(env: RuntimeEnv) {
  const release = await activeRelease(env);
  if (!release) throw new HttpError(404, "not_found", "Active release was not found");
  return releaseSnapshot(env, release.id);
}

export async function pendingReleases(env: RuntimeEnv) {
  const result = await env.CONTENT_DB.prepare(
    `SELECT * FROM releases WHERE state IN ('candidate', 'deploying') ORDER BY created_at`,
  ).all<ReleaseRow>();
  return { releases: result.results.map(releaseJson) };
}

export async function reconcileRelease(
  env: RuntimeEnv,
  input: { releaseId?: string; pagesDeploymentId?: string },
) {
  const release = await getRelease(env, String(input.releaseId || ""));
  if (!release.publish_job_id) {
    throw new HttpError(409, "release_conflict", "Release has no publication job");
  }
  const job = await getJob(env, release.publish_job_id);
  if (job.release_id !== release.id) {
    throw new HttpError(409, "release_stale", "Release is no longer the job candidate");
  }
  return activateRelease(env, job, release, String(input.pagesDeploymentId || ""));
}
