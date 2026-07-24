import * as crypto from "crypto";

/**
 * Logs in to Instagram's private (Android app) API with a username/password
 * and obtains a `sessionid` cookie. Only login is implemented here -- no
 * media upload, direct messages, 2FA, challenge resolution, captcha
 * solving, realtime, etc.
 *
 * Instagram periodically retires app versions and rejects logins whose
 * device fingerprint doesn't match a currently-accepted one. If login starts
 * failing outright (not a bad-password error), re-sync APP_VERSION,
 * VERSION_CODE, BLOKS_VERSIONING_ID and DEVICE below against a current
 * Instagram Android app release.
 *
 * 2FA is NOT supported. If your account has it enabled, this will throw --
 * fall back to copying a sessionid cookie from your browser instead.
 */

const APP_VERSION = "428.0.0.47.67";
const VERSION_CODE = "961145276";
const BLOKS_VERSIONING_ID = "7189b949425f9bf80ea8bd880cf5a3080b292d9b1c4b38a18d112f7c4b71e7a8";
// The Android app's X-IG-App-ID. Deliberately different from the web app id
// (936619743392459) used by src/helpers/instagramApi.ts for browser-style
// requests -- this one is only used for the login request itself.
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

type DeviceIds = {
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

const buildBaseHeaders = (deviceIds: DeviceIds, locale: string): Record<string, string> => ({
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
});

type PublicKeyMaterial = { keyId: number; publicKey: string };

// Instagram returns the current RSA key + key id via response headers on
// essentially any request.
const fetchPasswordPublicKey = async (headers: Record<string, string>): Promise<PublicKeyMaterial> => {
    const response = await fetch("https://i.instagram.com/api/v1/qe/sync/", { method: "GET", headers });
    const keyId = response.headers.get("ig-set-password-encryption-key-id");
    const publicKey = response.headers.get("ig-set-password-encryption-pub-key");
    if (!keyId || !publicKey) {
        throw new Error(
            "Instagram did not return password encryption keys (ig-set-password-encryption-* headers missing). " +
            `Response status: ${response.status}.`
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

export type LoginSession = {
    sessionId: string;
    userId: string;
};

export const loginWithPassword = async (username: string, password: string): Promise<LoginSession> => {
    const deviceIds = generateDeviceIds();
    const locale = "en_US";
    const headers = buildBaseHeaders(deviceIds, locale);

    const key = await fetchPasswordPublicKey(headers);
    const encPassword = encryptPassword(password, key);

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

    const json: any = await response.json().catch(() => ({}));

    if (!response.ok || !json?.logged_in_user) {
        if (json?.two_factor_required) {
            throw new Error(
                "Instagram requires two-factor authentication for this account. " +
                "This tool does not implement 2FA -- copy a sessionid cookie from your browser instead."
            );
        }
        throw new Error(`Instagram login failed (HTTP ${response.status}): ${JSON.stringify(json).slice(0, 500)}`);
    }

    const setCookies: string[] =
        typeof (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function"
            ? (response.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
            : [response.headers.get("set-cookie") || ""];

    const sessionCookie = setCookies.find(cookie => cookie.startsWith("sessionid="));
    if (!sessionCookie) {
        throw new Error("Login response did not include a sessionid cookie.");
    }

    return {
        sessionId: decodeURIComponent(sessionCookie.split(";")[0].split("=")[1]),
        userId: String(json.logged_in_user.pk),
    };
};
