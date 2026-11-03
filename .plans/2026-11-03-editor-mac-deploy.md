# Plan

## Goal

Deploy PR #188's reviewed editor to https://editor.popyson.com for owner testing,
without merging the PR or publishing content.

## Scope

Continue from the Cloud handoff on a dedicated local branch in the ghq checkout.
Use the verified portable artifact built from the active published snapshot.
Preserve Worker Secrets and the owner-only Access policy with mandatory TOTP.

## Non-goals

Merging, publishing articles, changing public-site delivery, or rebuilding the
production editor with test fixtures.

## Assumptions

The owner approved this plan in chat on 2026-11-03. The ghq checkout was newly
cloned and clean. PR head c4f7809 differs from artifact commit c7ff540 only in
handoff documentation. Artifact 13219069487 is not expired at initial inspection.
Mac Cloudflare authentication still needs verification.

## Steps

1. Create a dedicated branch; download and inspect artifact provenance and config.
2. Authenticate Cloudflare securely; inspect Access policy and secret-name metadata.
3. Run Wrangler dry-run, then deploy the editor while preserving secrets.
4. Verify deployment and unauthenticated denial; hand off real owner login/testing.

## Verification

Confirm the successful Actions run, artifact commit, and source equivalence.
Inspect protected custom-domain configuration and run Wrangler dry-run.
After deployment inspect Worker version/domain/settings and HTTP access behavior.
Review local changes and confirm PR #188 remains unmerged.

## Open Issues

The owner reported successful hands-on verification and authorized merge on
2026-11-03. Mac OAuth does not grant Access policy read access (HTTP 403); the
existing policy was inspected through the dashboard and was not changed.
GitHub's main ruleset requires one approving review; final merge must respect
that rule or obtain explicit owner authorization for an available bypass.

## Result

- Downloaded artifact 13219069487 from successful Actions run 41314413535,
  attempt 2. The workflow used the active published release and passed standard
  verification; its production build did not use test fixtures.
- Confirmed commit.txt is c7ff540404171e22bfe2d244f63d0780025b4ca2 and only
  handoff documents differ from PR head c4f7809. Production config assertions
  and Wrangler 4.120.0 dry-run passed under Node 22.23.4.
- Authenticated Wrangler through device authorization after the localhost flow
  timed out. Credentials use encrypted storage with a key in macOS Keychain.
  Credential values were not displayed or placed in the checkout. Wrangler's
  automatically generated auth-command log entries were redacted locally.
- Deployed at 2026-11-03 20:01 JST. Version:
  df1c7684-bafd-427a-b25c-1acf2a74f188 (100%). Previous bootstrap version:
  5598bd25-3772-49e5-9e3d-1c038858c877.
- API readback confirmed the editor custom domain, ASSETS binding, all three
  secret_text bindings, and disabled workers.dev/preview URLs.
- curl verified HTTP 302 to the expected Access login for /, /editor,
  /editor.html, the actual editor JavaScript, /api/posts, and an image path.
  The Mac resolver retained a negative DNS cache after domain creation; checks
  used a public-resolver-verified edge IP with normal TLS verification. Chrome
  resolved the hostname normally and rendered the Access login page.
- At deployment PR #188 remained OPEN with mergedAt null; its branch was not changed.
- Owner login/TOTP, editor rendering, and authenticated draft operations remain
  acceptance checks. No content was published.

## Owner acceptance follow-up

The owner reached the editor in Chrome but content listing returned
`Content API request failed (401)`. Browser sign-in and the shell render, while
the upstream author API rejects service authentication. Do not treat the editor
as operational based on the initial deployment checks alone.

Read-only dashboard inspection confirmed the author Access policy selects
`popyson-io-token`. Its client ID matches AUTHOR_SERVICE_TOKEN_ID in both the
repository and the deployed content Worker. The separate
`popyson-content-author` token is not selected by this policy.

At the owner's request, corrected the editor Worker's CF_ACCESS_CLIENT_ID from
the confirmed author identity using Wrangler secret put, without displaying its
value or logging credentials. A browser reload still returned 401. Opened the
Production CF_ACCESS_CLIENT_SECRET edit dialog for owner entry of the matching
saved Client Secret. Cloudflare cannot read back this Secret, and this Mac has
no configured 1Password account or local credential references. No service token
was regenerated and no Access policy was changed. Await owner input, then verify
the authenticated content list before further draft tests.

After the owner reported completing the Secret update, reloaded the editor in
the owner's authenticated Chrome session. The 401 cleared, the content list
loaded, and an existing public article opened with its title and Markdown body.
No article was modified, saved, or published. Draft saving, uploads, history,
publication permissions, and production preview performance were not independently
verified by the agent; successful listing/reading does not establish those operations.

The owner subsequently reported completing hands-on testing and authorized merge
if final checks pass. Record deployment, the actual author service-token name,
and the credential correction in the PR before merging. Preserve local changes
and use the reviewed head SHA for the final merge.
