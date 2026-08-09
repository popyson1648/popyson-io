import { execFileSync } from "node:child_process";
import { userInfo } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function tailscaleOperatorArguments(username = userInfo().username) {
  if (!/^[a-z_][a-z0-9_-]*[$]?$/i.test(username)) {
    throw new Error(`Unsupported local username: ${username}`);
  }
  return ["tailscale", "set", `--operator=${username}`];
}

export function setupEditorTailscale() {
  const args = tailscaleOperatorArguments();
  console.log(
    "Tailscale needs one-time administrator approval so npm run editor can maintain its Serve listener.",
  );
  execFileSync("sudo", args, { stdio: "inherit" });
  console.log("Tailscale operator configured. Start the editor with `npm run editor`.");
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) setupEditorTailscale();
