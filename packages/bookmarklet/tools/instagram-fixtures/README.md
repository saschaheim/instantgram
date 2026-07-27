# Instagram live fixture fetcher

A standalone, maintainer-only tool to capture real Instagram API responses
for turning into `tests/fixtures/*.json`. It is **not** part of the
production bookmarklet, the build, or the test suite -- it's never bundled
and never runs in CI.

Logging in and obtaining a `sessionid` is implemented with zero external
dependencies (Node's built-in `crypto`/`fetch` cover the RSA+AES password
encryption and HTTP calls). The modern Android login response doesn't set a
`sessionid` cookie at all -- it returns an
`ig-set-authorization: Bearer IGT:2:<base64 JSON>` header whose decoded
payload has a `sessionid` field. Data fetching then reuses the exact same
device fingerprint, cookies, and Authorization header the session was
created with, hitting Instagram's private (Android app) API endpoints.

The obtained session is cached to `session.json` (gitignored) and reused on
later runs, so you're not logging in -- and re-triggering 2FA and Instagram's
"new login" security email -- on every single invocation. If the cached
session turns out to be invalid/expired (HTTP 401/403), it logs in fresh
once and updates the cache.

## Important caveats

- **Only the classic verification-code 2FA flow is supported** (you'll be
  prompted on the terminal for the code Instagram sends you). The newer
  "Bloks" 2FA flow is not implemented -- if you hit that instead, copy a
  `sessionid` cookie from your browser instead (DevTools -> Application/
  Storage -> Cookies) and use it directly.
- **This mimics an Android app login from a script**, which is exactly the
  kind of activity Instagram's abuse detection watches for. Only run this
  from your own trusted network with your own account, and expect it may
  occasionally get flagged/challenged like any automated login would.
- **The device fingerprint constants in `login.ts` (app version, bloks
  versioning id, etc.) go stale.** Instagram periodically retires old app
  versions. If login fails outright (not a bad-password error), re-sync
  those constants against a current Instagram Android app release.
- **Never commit `credentials.json` or `session.json`** (both gitignored) --
  `session.json`'s sessionid is equivalent to your password. Also check
  anything under `output/` for personal data before reusing it in a fixture.

## Setup

```
cd tools/instagram-fixtures
cp credentials.example.json credentials.json
# edit credentials.json with your own username/password
npx tsc -p tsconfig.json
```

## Usage

```
node dist/fetch-fixtures.js profile <username>
node dist/fetch-fixtures.js media <shortcode>
node dist/fetch-fixtures.js story <username>
node dist/fetch-fixtures.js search <username>
```

Each command logs in, fetches the endpoint, and writes the raw
`{ status, body }` response to `output/<name>.json`. Review it (redact
anything sensitive) before copying the relevant bits into a new
`tests/fixtures/*.json` file and a matching test.
