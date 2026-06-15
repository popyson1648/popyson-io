/* ============================================================
   One-time Instapaper xAuth helper.

   Exchanges your Instapaper username/password for an OAuth access
   token + secret. Run this ONCE, then store the printed token and
   secret in 1Password. The fetch script uses those long-lived
   credentials and never needs your password again.

   Usage (via 1Password, password not stored in the repo):
     op run --env-file=.op.env.auth -- node scripts/instapaper_auth.mjs

   Required env:
     INSTAPAPER_CONSUMER_KEY
     INSTAPAPER_CONSUMER_SECRET
     INSTAPAPER_USERNAME           (email/username)
     INSTAPAPER_PASSWORD           (may be empty if account has none)
   ============================================================ */
import { oauthPost, parseFormEncoded, requireEnv } from "./instapaper_oauth.mjs";

async function main() {
  const env = requireEnv([
    "INSTAPAPER_CONSUMER_KEY",
    "INSTAPAPER_CONSUMER_SECRET",
    "INSTAPAPER_USERNAME",
  ]);

  const text = await oauthPost({
    path: "/oauth/access_token",
    params: {
      x_auth_username: env.INSTAPAPER_USERNAME,
      x_auth_password: process.env.INSTAPAPER_PASSWORD ?? "",
      x_auth_mode: "client_auth",
    },
    consumerKey: env.INSTAPAPER_CONSUMER_KEY,
    consumerSecret: env.INSTAPAPER_CONSUMER_SECRET,
  });

  const { oauth_token, oauth_token_secret } = parseFormEncoded(text);
  if (!oauth_token || !oauth_token_secret) {
    throw new Error(`Unexpected access_token response:\n${text}`);
  }

  /* Printed to stdout so you can copy them into 1Password. */
  console.log("Store these in 1Password (do NOT commit):\n");
  console.log(`INSTAPAPER_OAUTH_TOKEN=${oauth_token}`);
  console.log(`INSTAPAPER_OAUTH_TOKEN_SECRET=${oauth_token_secret}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
