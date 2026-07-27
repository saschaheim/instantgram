import * as crypto from "crypto";
import * as readline from "readline";

/**
 * Logs in to Instagram's private (Android app) API with a username/password
 * and makes authenticated private-API requests with the resulting session.
 * Only login and a handful of read-only data endpoints are implemented here
 * -- no media upload, direct messages, challenge resolution, captcha
 * solving, realtime, etc. Only the classic verification-code 2FA flow
 * (accounts/two_factor_login/) is supported, not the newer "Bloks" 2FA flow.
 *
 * Every authenticated request -- not just login -- must be sent with the
 * same device fingerprint (same phone_id/uuid/android_device_id) and a
 * freshly rebuilt `Authorization` header on every private request. Mixing
 * this session with a different header set (e.g. the browser-style headers
 * src/helpers/instagramApi.ts uses) reads as a suspicious identity switch to
 * Instagram and gets rate-limited/blocked even though the session itself is
 * valid -- use privateRequest() below for all post-login calls, not a
 * hand-rolled fetch.
 *
 * Instagram periodically retires app versions and rejects logins whose
 * device fingerprint doesn't match a currently-accepted one. If login starts
 * failing outright (not a bad-password error), re-sync APP_VERSION,
 * VERSION_CODE, BLOKS_VERSIONING_ID and DEVICE below against a current
 * Instagram Android app release.
 */

const APP_VERSION = "428.0.0.47.67";
const VERSION_CODE = "961145276";
const BLOKS_VERSIONING_ID = "7189b949425f9bf80ea8bd880cf5a3080b292d9b1c4b38a18d112f7c4b71e7a8";
// The Android app's X-IG-App-ID, used for every private-API request
// (including data fetches after login) -- NOT the web app id
// (936619743392459) src/helpers/instagramApi.ts uses for browser requests.
const ANDROID_APP_ID = "567067343352427";

const DEVICE = {
    androidVersion: 34,
    androidRelease: "14",
    dpi: "480dpi",
    resolution: "1344x2992",
    manufacturer: "Google/google",
    model: "Pixel 8 Pro",
    device: "husky",
    cpu: "husky",
};

const buildUserAgent = (locale: string): string =>
    `Instagram ${APP_VERSION} Android (${DEVICE.androidVersion}/${DEVICE.androidRelease}; ${DEVICE.dpi}; ` +
    `${DEVICE.resolution}; ${DEVICE.manufacturer}; ${DEVICE.model}; ${DEVICE.device}; ${DEVICE.cpu}; ${locale}; ${VERSION_CODE})`;

export type DeviceIds = {
    phoneId: string;
    uuid: string;
    advertisingId: string;
    androidDeviceId: string;
};

const generateAndroidDeviceId = (): string =>
    `android-${crypto.createHash("sha256").update(String(Date.now())).digest("hex").slice(0, 16)}`;

const generateDeviceIds = (): DeviceIds => ({
    phoneId: crypto.randomUUID(),
    uuid: crypto.randomUUID(),
    advertisingId: crypto.randomUUID(),
    androidDeviceId: generateAndroidDeviceId(),
});

// Generates the `jazoest` checksum Instagram's login endpoint expects.
const generateJazoest = (input: string): string => {
    let sum = 0;
    for (const char of input) {
        sum += char.charCodeAt(0);
    }
    return `2${sum}`;
};

// --- Minimal cookie jar --------------------------------------------------
// Instagram's csrftoken (needed by the two-factor step's request body) is
// set via Set-Cookie on earlier responses, not returned in any JSON body.
// The jar is also persisted as part of the session (see LoginSession) and
// resent on every later private request, mirroring how a real client's
// cookie jar and Authorization header coexist across a whole session.

export type CookieJar = Map<string, string>;

const extractSetCookies = (response: Response): string[] => {
    const withGetSetCookie = response.headers as unknown as { getSetCookie?: () => string[] };
    return typeof withGetSetCookie.getSetCookie === "function"
        ? withGetSetCookie.getSetCookie()
        : [response.headers.get("set-cookie") || ""].filter(Boolean);
};

const rememberCookies = (jar: CookieJar, response: Response): void => {
    for (const cookie of extractSetCookies(response)) {
        const [pair] = cookie.split(";");
        const separatorIndex = pair.indexOf("=");
        if (separatorIndex === -1) continue;
        jar.set(pair.slice(0, separatorIndex).trim(), decodeURIComponent(pair.slice(separatorIndex + 1).trim()));
    }
};

const cookieHeader = (jar: CookieJar): string =>
    Array.from(jar.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");

const buildBaseHeaders = (deviceIds: DeviceIds, locale: string, jar: CookieJar): Record<string, string> => ({
    "X-IG-App-Locale": locale,
    "X-IG-Device-Locale": locale,
    "X-IG-Mapped-Locale": locale,
    "X-Pigeon-Session-Id": `UFS-${crypto.randomUUID()}-1`,
    "X-Pigeon-Rawclienttime": (Date.now() / 1000).toFixed(3),
    "X-IG-Bandwidth-Speed-KBPS": "2500.000",
    "X-IG-Bandwidth-TotalBytes-B": "5000000",
    "X-IG-Bandwidth-TotalTime-MS": "2000",
    "X-IG-App-Startup-Country": "US",
    "X-Bloks-Version-Id": BLOKS_VERSIONING_ID,
    "X-IG-WWW-Claim": "0",
    "X-Bloks-Is-Layout-RTL": "false",
    "X-Bloks-Is-Panorama-Enabled": "true",
    "X-IG-Device-ID": deviceIds.uuid,
    "X-IG-Family-Device-ID": deviceIds.phoneId,
    "X-IG-Android-ID": deviceIds.androidDeviceId,
    "X-IG-Timezone-Offset": String(-new Date().getTimezoneOffset() * 60),
    "X-IG-Connection-Type": "WIFI",
    "X-IG-Capabilities": "3brTv10=",
    "X-IG-App-ID": ANDROID_APP_ID,
    "User-Agent": buildUserAgent(locale),
    "Accept-Language": `${locale.replace("_", "-")}, en-US`,
    "Accept-Encoding": "gzip, deflate",
    Connection: "keep-alive",
    // Instagram's edge appears to enforce Fetch Metadata validation on
    // i.instagram.com endpoints uniformly, regardless of whether the rest of
    // the headers look like a browser or an app -- without these, requests
    // get rejected with "SecFetch Policy violation." (HTTP 400).
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    ...(jar.size > 0 ? { Cookie: cookieHeader(jar) } : {}),
});

// The password-encryption-key bootstrap call (qe/sync/) is sent from a
// separate, much simpler "public" browser-like session, NOT the
// Android-app-fingerprint session used for private-API requests -- no
// X-IG-App-ID, no X-Bloks-*/X-Pigeon-* at all. Using the Android headers
// here gets rejected with "SecFetch Policy violation." (HTTP 400), since
// that combination doesn't match anything a real client sends.
const buildPublicHeaders = (): Record<string, string> => ({
    Connection: "Keep-Alive",
    Accept: "*/*",
    "Accept-Encoding": "gzip,deflate",
    "Accept-Language": "en-US",
    "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 " +
        "(KHTML, like Gecko) Version/11.1.2 Safari/605.1.15",
    // Fetch Metadata headers a real browser attaches automatically; Node's
    // fetch does not send them on its own.
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
});

type PublicKeyMaterial = { keyId: number; publicKey: string };

// Instagram returns the current RSA key + key id via response headers on
// essentially any request.
const fetchPasswordPublicKey = async (jar: CookieJar): Promise<PublicKeyMaterial> => {
    const response = await fetch("https://i.instagram.com/api/v1/qe/sync/", {
        method: "GET",
        headers: buildPublicHeaders(),
    });
    rememberCookies(jar, response);
    const keyId = response.headers.get("ig-set-password-encryption-key-id");
    const publicKey = response.headers.get("ig-set-password-encryption-pub-key");
    if (!keyId || !publicKey) {
        const body = await response.text().catch(() => "<could not read body>");
        throw new Error(
            "Instagram did not return password encryption keys (ig-set-password-encryption-* headers missing). " +
            `Response status: ${response.status}. Body: ${body.slice(0, 1000)}`
        );
    }
    return { keyId: Number(keyId), publicKey };
};

// An RSA-PKCS1v1.5-wrapped AES-256-GCM session key encrypting the password,
// prefixed with a version byte and the key id, base64-encoded.
const encryptPassword = (password: string, key: PublicKeyMaterial): string => {
    const sessionKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const timestamp = String(Math.floor(Date.now() / 1000));

    const rsaEncrypted = crypto.publicEncrypt(
        { key: Buffer.from(key.publicKey, "base64").toString(), padding: crypto.constants.RSA_PKCS1_PADDING },
        sessionKey
    );

    const cipher = crypto.createCipheriv("aes-256-gcm", sessionKey, iv);
    cipher.setAAD(Buffer.from(timestamp));
    const aesEncrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const sizeBuffer = Buffer.alloc(2);
    sizeBuffer.writeUInt16LE(rsaEncrypted.byteLength, 0);

    const payload = Buffer.concat([
        Buffer.from([1, key.keyId]),
        iv,
        sizeBuffer,
        rsaEncrypted,
        authTag,
        aesEncrypted,
    ]).toString("base64");

    return `#PWD_INSTAGRAM:4:${timestamp}:${payload}`;
};

// This is NOT a real HMAC -- Instagram stopped validating it server-side,
// so the client just wraps the JSON body in this fixed envelope.
const signBody = (data: Record<string, unknown>): string =>
    `signed_body=SIGNATURE.${encodeURIComponent(JSON.stringify(data))}`;

const promptForVerificationCode = async (): Promise<string> => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
        return await new Promise<string>(resolve => {
            rl.question("Enter the 2FA verification code Instagram sent you: ", answer => resolve(answer.trim()));
        });
    } finally {
        rl.close();
    }
};

// The modern Android private API doesn't set a sessionid cookie at all --
// it returns an `ig-set-authorization` response header shaped like
// `Bearer IGT:2:<base64 JSON>`, where the JSON payload has a `sessionid`
// field (itself percent-encoded, same format as the classic cookie value).
const parseAuthorizationHeader = (authorization: string | null): Record<string, string> => {
    const match = authorization?.match(/IGT:\d+:([A-Za-z0-9+/=]+)/);
    if (!match) return {};
    try {
        return JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
    } catch {
        return {};
    }
};

const extractSessionId = (response: Response): string | null => {
    const sessionCookie = extractSetCookies(response).find(cookie => cookie.startsWith("sessionid="));
    if (sessionCookie) {
        return decodeURIComponent(sessionCookie.split(";")[0].split("=")[1]);
    }
    const authData = parseAuthorizationHeader(response.headers.get("ig-set-authorization"));
    return typeof authData.sessionid === "string" ? decodeURIComponent(authData.sessionid) : null;
};

const parseJsonBody = (rawBody: string): any => {
    try {
        return JSON.parse(rawBody);
    } catch {
        return {};
    }
};

export type LoginSession = {
    sessionId: string;
    userId: string;
    deviceIds: DeviceIds;
    locale: string;
    /** Snapshot of accumulated cookies (csrftoken, mid, etc.) at login time. */
    cookies: Record<string, string>;
};

// Rebuilds the `Bearer IGT:2:<base64>` header that must be resent on every
// subsequent private request, built fresh from the session's own
// ds_user_id/sessionid, since there's no cookie-based session to rely on
// for these accounts.
const buildAuthorizationHeader = (session: LoginSession): string => {
    const payload = { ds_user_id: session.userId, sessionid: encodeURIComponent(session.sessionId) };
    return `Bearer IGT:2:${Buffer.from(JSON.stringify(payload)).toString("base64")}`;
};

// The classic verification-code 2FA flow (NOT the newer "Bloks" 2FA flow,
// which is a separate, more involved protocol not implemented here).
const completeTwoFactorLogin = async (
    username: string,
    deviceIds: DeviceIds,
    locale: string,
    headers: Record<string, string>,
    jar: CookieJar,
    twoFactorIdentifier: string
): Promise<LoginSession> => {
    const verificationCode = await promptForVerificationCode();

    const body = {
        verification_code: verificationCode,
        phone_id: deviceIds.phoneId,
        _csrftoken: jar.get("csrftoken") || "",
        two_factor_identifier: twoFactorIdentifier,
        username,
        trust_this_device: "0",
        guid: deviceIds.uuid,
        device_id: deviceIds.androidDeviceId,
        waterfall_id: crypto.randomUUID(),
        verification_method: "3",
    };

    const response = await fetch("https://i.instagram.com/api/v1/accounts/two_factor_login/", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: signBody(body),
    });
    rememberCookies(jar, response);

    const rawBody = await response.text();
    const json = parseJsonBody(rawBody);

    if (!response.ok || !json?.logged_in_user) {
        throw new Error(`Instagram two-factor login failed (HTTP ${response.status}): ${rawBody.slice(0, 1000)}`);
    }

    // The sessionid is sometimes set on the *first* (two_factor_required)
    // response rather than this one -- rememberCookies has been accumulating
    // it in the jar across every response since the start of the flow, so
    // read it from there instead of only this response's own Set-Cookie.
    const sessionId = jar.get("sessionid") || extractSessionId(response);
    if (!sessionId) {
        throw new Error(
            "No sessionid was found anywhere during the two-factor login flow.\n" +
            `Jar contents: ${JSON.stringify(Object.fromEntries(jar))}\n` +
            `This response's Set-Cookie header(s): ${JSON.stringify(extractSetCookies(response))}\n` +
            `Authorization header: ${response.headers.get("ig-set-authorization") || "<none>"}\n` +
            `Response body: ${rawBody.slice(0, 1500)}`
        );
    }

    return {
        sessionId,
        userId: String(json.logged_in_user.pk),
        deviceIds,
        locale,
        cookies: Object.fromEntries(jar),
    };
};

export const loginWithPassword = async (username: string, password: string): Promise<LoginSession> => {
    const deviceIds = generateDeviceIds();
    const locale = "en_US";
    const jar: CookieJar = new Map();

    const key = await fetchPasswordPublicKey(jar);
    const encPassword = encryptPassword(password, key);
    const headers = buildBaseHeaders(deviceIds, locale, jar);

    const body = {
        jazoest: generateJazoest(deviceIds.phoneId),
        country_codes: JSON.stringify([{ country_code: "1", source: ["default"] }]),
        phone_id: deviceIds.phoneId,
        enc_password: encPassword,
        username,
        adid: deviceIds.advertisingId,
        guid: deviceIds.uuid,
        device_id: deviceIds.androidDeviceId,
        google_tokens: "[]",
        login_attempt_count: "0",
    };

    const response = await fetch("https://i.instagram.com/api/v1/accounts/login/", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: signBody(body),
    });
    rememberCookies(jar, response);

    const rawBody = await response.text();
    const json = parseJsonBody(rawBody);

    if (!response.ok || !json?.logged_in_user) {
        if (json?.two_factor_required) {
            const twoFactorIdentifier = json?.two_factor_info?.two_factor_identifier;
            if (!twoFactorIdentifier) {
                throw new Error(
                    "Instagram requires two-factor authentication, but no two_factor_identifier was returned. " +
                    `Raw response: ${rawBody.slice(0, 1000)}`
                );
            }
            return completeTwoFactorLogin(
                username,
                deviceIds,
                locale,
                buildBaseHeaders(deviceIds, locale, jar),
                jar,
                twoFactorIdentifier
            );
        }
        throw new Error(`Instagram login failed (HTTP ${response.status}): ${rawBody.slice(0, 1000)}`);
    }

    const sessionId = jar.get("sessionid") || extractSessionId(response);
    if (!sessionId) {
        throw new Error("Login response did not include a sessionid.");
    }

    return {
        sessionId,
        userId: String(json.logged_in_user.pk),
        deviceIds,
        locale,
        cookies: Object.fromEntries(jar),
    };
};

export type PrivateRequestOptions = {
    /** Query string params, GET-style. */
    params?: Record<string, string>;
    /** Presence implies POST with a signed body; absence implies GET. */
    data?: Record<string, unknown>;
};

export type PrivateRequestResult = { status: number; body: any };

/**
 * Sends a request to i.instagram.com/api/v1/<endpoint> using the exact same
 * device fingerprint, cookie jar, and Authorization header the session was
 * created with. Use this for every post-login call instead of a hand-rolled
 * fetch: reusing the session with different/inconsistent headers is what
 * previously got requests rate-limited (HTTP 429) even though the session
 * was valid.
 */
export const privateRequest = async (
    session: LoginSession,
    endpoint: string,
    options: PrivateRequestOptions = {}
): Promise<PrivateRequestResult> => {
    const jar: CookieJar = new Map(Object.entries(session.cookies));
    const headers = {
        ...buildBaseHeaders(session.deviceIds, session.locale, jar),
        Authorization: buildAuthorizationHeader(session),
    };

    const url = new URL(`https://i.instagram.com/api/v1/${endpoint.replace(/^\//, "")}`);
    for (const [key, value] of Object.entries(options.params ?? {})) {
        url.searchParams.set(key, value);
    }

    const init: RequestInit = { method: options.data ? "POST" : "GET", headers };
    if (options.data) {
        (headers as Record<string, string>)["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
        init.body = signBody({
            _uid: session.userId,
            _uuid: session.deviceIds.uuid,
            ...options.data,
        });
    }

    const response = await fetch(url.toString(), init);
    const rawBody = await response.text();
    return { status: response.status, body: parseJsonBody(rawBody) };
};
