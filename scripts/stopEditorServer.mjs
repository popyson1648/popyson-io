import { existsSync, readFileSync, readlinkSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { EDITOR_PID_FILE } from "./editorServer.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export function isEditorServerProcess(command, cwd, root = ROOT) {
  return (
    String(command || "").includes("scripts/editorServer.mjs") &&
    resolve(String(cwd || "")) === resolve(root)
  );
}

async function waitUntilStopped(pid) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === "ESRCH") return true;
      throw error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  return false;
}

export async function stopEditorServer() {
  if (!existsSync(EDITOR_PID_FILE)) {
    console.log("Content editor is not running.");
    return false;
  }
  const pid = Number(readFileSync(EDITOR_PID_FILE, "utf8").trim());
  if (!Number.isSafeInteger(pid) || pid <= 1) {
    throw new Error(`Invalid editor PID file: ${EDITOR_PID_FILE}`);
  }
  let command;
  let cwd;
  try {
    command = readFileSync(`/proc/${pid}/cmdline`, "utf8").replaceAll("\0", " ");
    cwd = readlinkSync(`/proc/${pid}/cwd`);
  } catch (error) {
    if (error.code === "ENOENT") {
      rmSync(EDITOR_PID_FILE, { force: true });
      console.log("Removed a stale editor PID file; the server was not running.");
      return false;
    }
    throw error;
  }
  if (!isEditorServerProcess(command, cwd)) {
    throw new Error(`PID ${pid} is not this repository's content editor; refusing to stop it.`);
  }

  process.kill(pid, "SIGTERM");
  if (!(await waitUntilStopped(pid))) {
    throw new Error(`Content editor PID ${pid} did not stop after SIGTERM.`);
  }
  rmSync(EDITOR_PID_FILE, { force: true });
  console.log(`Stopped content editor PID ${pid}.`);
  return true;
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) await stopEditorServer();
