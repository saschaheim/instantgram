# Instagram live fixture fetcher

A standalone, maintainer-only tool to capture real Instagram API responses
for turning into `tests/fixtures/*.json`. It is **not** part of the
production bookmarklet, the build, or the test suite -- it's never bundled
and never runs in CI.

Logging in and obtaining a `sessionid` is implemented with zero external
dependencies (Node's built-in `crypto`/`fetch` cover the RSA+AES password
encryption and HTTP calls). Data fetching then reuses the exact same
web-style endpoints `src/helpers/instagramApi.ts` calls from the browser,
just with the session sent as a `Cookie` header instead of a browser cookie
jar.

## Important caveats

- **2FA is not supported.** If your account has two-factor auth enabled,
  login will fail -- copy a `sessionid` cookie from your browser instead
  (DevTools -> Application/Storage -> Cookies) and use it directly rather
  than running this tool.
- **This mimics an Android app login from a script**, which is exactly the
  kind of activity Instagram's abuse detection watches for. Only run this
  from your own trusted network with your own account, and expect it may
  occasionally get flagged/challenged like any automated login would.
- **The device fingerprint constants in `login.ts` (app version, bloks
  versioning id, etc.) go stale.** Instagram periodically retires old app
  versions. If login fails outright (not a bad-password error), re-sync
  those constants against a current Instagram Android app release.
- **Never commit `credentials.json`** (it's gitignored) or anything under
  `output/` without first checking it for personal data you don't want in
  the fixture.

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
