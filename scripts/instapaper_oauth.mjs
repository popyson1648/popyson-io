/* ============================================================
   Instapaper OAuth 1.0a helpers (HMAC-SHA1), zero dependencies.

   Instapaper Full API requires signed OAuth 1.0a requests over
   HTTPS. This module implements the minimal signing needed to:
     - exchange username/password for an access token (xAuth), and
     - call signed endpoints such as /bookmarks/list.

   See https://www.instapaper.com/api/full
   ============================================================ */
import crypto from "node:crypto";

const API_BASE = "https://www.instapaper.com/api/1";

/* RFC 3986 percent-encoding (OAuth requires encoding beyond
   encodeURIComponent for ! * ' ( )). */
export function rfc3986(str) {
  return encodeURIComponent(str).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/* Build the OAuth signature base string and sign it with HMAC-SHA1.
   `params` is the merged set of OAuth + request parameters. */
export function sign({ method, url, params, consumerSecret, tokenSecret = "" }) {
  const normalized = Object.keys(params)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(params[k])}`)
    .join("&");

  const base = [method.toUpperCase(), rfc3986(url), rfc3986(normalized)].join("&");

  const signingKey = `${rfc3986(consumerSecret)}&${rfc3986(tokenSecret)}`;
  return crypto.createHmac("sha1", signingKey).update(base).digest("base64");
}

/* Perform a signed OAuth 1.0a POST with form-encoded params.
   Returns the raw response text (Instapaper returns form-encoded
   for the token endpoint and JSON for data endpoints). */
export async function oauthPost({
  path,
  params = {},
  consumerKey,
  consumerSecret,
  token = "",
  tokenSecret = "",
}) {
  const url = `${API_BASE}${path}`;

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
  };
  if (token) oauthParams.oauth_token = token;

  const allParams = { ...oauthParams, ...params };
  const signature = sign({
    method: "POST",
    url,
    params: allParams,
    consumerSecret,
    tokenSecret,
  });

  const authHeader =
    "OAuth " +
    Object.entries({ ...oauthParams, oauth_signature: signature })
      .map(([k, v]) => `${rfc3986(k)}="${rfc3986(v)}"`)
      .join(", ");

  const body = Object.entries(params)
    .map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`)
    .join("&");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Instapaper ${path} failed: HTTP ${res.status} ${res.statusText}\n${text}`);
  }
  return text;
}

/* Parse a form-encoded response body into a plain object. */
export function parseFormEncoded(text) {
  const out = {};
  for (const pair of text.split("&")) {
    if (!pair) continue;
    const [k, v = ""] = pair.split("=");
    out[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return out;
}

/* Read required env vars or throw with a clear message. */
export function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    throw new Error(
      `Missing required env var(s): ${missing.join(", ")}\n` +
        `Provide them via 1Password, e.g. \`op run --env-file=.op.env -- ...\`.`,
    );
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n]]));
}
