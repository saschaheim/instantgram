"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const login_1 = require("./login");
/**
 * CLI to log in (see login.ts) and fetch the same underlying data
 * src/helpers/instagramApi.ts fetches from the browser, saving the raw
 * response to tools/instagram-fixtures/output/ for turning into a
 * tests/fixtures/*.json fixture by hand.
 *
 * Usage:
 *   node dist/fetch-fixtures.js profile <username>
 *   node dist/fetch-fixtures.js media <shortcode>
 *   node dist/fetch-fixtures.js story <username>
 *   node dist/fetch-fixtures.js search <username>
 *
 * Requires tools/instagram-fixtures/credentials.json (gitignored) --
 * copy credentials.example.json and fill in your own username/password.
 *
 * Every request here goes through login.ts's privateRequest(), which reuses
 * the exact device fingerprint, cookies and Authorization header the
 * session was created with (instagrapi's private-API endpoints), rather
 * than src/helpers/instagramApi.ts's browser-style endpoints/headers --
 * mixing an Android-app session with browser-style requests reads as a
 * suspicious identity switch to Instagram and gets rate-limited even with a
 * valid session.
 *
 * The obtained session is cached to session.json (gitignored) and reused on
 * later runs, so you're not logging in (and re-triggering 2FA and
 * Instagram's "new login" security email) every single time. If a cached
 * session turns out to be invalid/expired (HTTP 401/403), this logs in
 * fresh once and updates the cache.
 */
const shortcodeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
// Mirrors src/helpers/instagramApi.ts's shortcodeToMediaId. Duplicated here
// (instead of imported) because this tool has its own Node-only tsconfig,
// while the source file's types assume a DOM/browser environment.
const shortcodeToMediaId = (shortcode) => {
    let mediaId = 0n;
    for (const char of shortcode) {
        const index = shortcodeAlphabet.indexOf(char);
        if (index === -1)
            return null;
        mediaId = mediaId * 64n + BigInt(index);
    }
    return mediaId.toString();
};
// Matches instagrapi's config.SUPPORTED_CAPABILITIES, sent along with
// feed/reels_media/ requests (see mixins/highlight.py's highlight_info_v1,
// the only confirmed real usage of this endpoint in the upstream source).
const SUPPORTED_CAPABILITIES = [
    {
        value: "119.0,120.0,121.0,122.0,123.0,124.0,125.0,126.0,127.0,128.0," +
            "129.0,130.0,131.0,132.0,133.0,134.0,135.0,136.0,137.0,138.0," +
            "139.0,140.0,141.0,142.0",
        name: "SUPPORTED_SDK_VERSIONS",
    },
    { value: "14", name: "FACE_TRACKER_VERSION" },
    { value: "ETC2_COMPRESSION", name: "COMPRESSION" },
    { value: "gyroscope_enabled", name: "gyroscope" },
];
// __dirname is tools/instagram-fixtures/dist/ once compiled; these files
// live one level up, alongside credentials.example.json.
const toolRoot = path.join(__dirname, "..");
const credentialsPath = path.join(toolRoot, "credentials.json");
const sessionPath = path.join(toolRoot, "session.json");
const loadCredentials = () => {
    if (!fs.existsSync(credentialsPath)) {
        console.error(`Missing ${credentialsPath}.\n` +
            "Copy credentials.example.json to credentials.json and fill in your own Instagram username/password " +
            "(this file is gitignored and must never be committed).");
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
};
const loadCachedSession = () => {
    if (!fs.existsSync(sessionPath))
        return null;
    try {
        const parsed = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
        // Guards against a session.json left over from an older, incompatible
        // shape of this tool (e.g. before deviceIds/cookies were cached) --
        // fall back to a fresh login instead of crashing on missing fields.
        if (!parsed?.sessionId || !parsed?.userId || !parsed?.deviceIds || !parsed?.cookies) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
};
const saveSession = (session) => {
    const cached = { ...session, savedAt: new Date().toISOString() };
    fs.writeFileSync(sessionPath, JSON.stringify(cached, null, 4));
};
const freshLogin = async () => {
    const { username, password } = loadCredentials();
    console.log(`Logging in as ${username}...`);
    const session = await (0, login_1.loginWithPassword)(username, password);
    saveSession(session);
    console.log(`Logged in (user id ${session.userId}).`);
    return session;
};
const isAuthError = (status) => status === 401 || status === 403;
const saveFixture = (name, result) => {
    const outputDir = path.join(toolRoot, "output");
    fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 4));
    console.log(`Saved ${filePath} (HTTP ${result.status})`);
};
const commands = {
    // Ports instagrapi's user_info_by_username_v1: GET users/<username>/usernameinfo/
    async profile(session, username) {
        const result = await (0, login_1.privateRequest)(session, `users/${encodeURIComponent(username)}/usernameinfo/`);
        saveFixture(`profile-usernameinfo-${username}`, result);
        return result;
    },
    // Ports instagrapi's media_info_v1: GET media/<id>/info/
    async media(session, shortcode) {
        const mediaId = shortcodeToMediaId(shortcode);
        if (!mediaId) {
            throw new Error(`Could not convert shortcode "${shortcode}" to a media id.`);
        }
        const result = await (0, login_1.privateRequest)(session, `media/${mediaId}/info/`);
        saveFixture(`media-info-${shortcode}`, result);
        return result;
    },
    // Ports instagrapi's highlight_info_v1's request shape (the only
    // confirmed real usage of feed/reels_media/ in the upstream source),
    // adapted for a regular (non-highlight) story: user_ids is just
    // [userId], with no "highlight:" prefix.
    async story(session, username) {
        const profile = await (0, login_1.privateRequest)(session, `users/${encodeURIComponent(username)}/usernameinfo/`);
        const userId = profile.body?.user?.pk;
        if (!userId) {
            saveFixture(`story-usernameinfo-${username}`, profile);
            if (isAuthError(profile.status))
                return profile;
            throw new Error(`Could not resolve a user id for @${username}; saved the profile lookup for inspection.`);
        }
        const result = await (0, login_1.privateRequest)(session, "feed/reels_media/", {
            data: {
                exclude_media_ids: "[]",
                supported_capabilities_new: JSON.stringify(SUPPORTED_CAPABILITIES),
                source: "profile",
                user_ids: [String(userId)],
            },
        });
        saveFixture(`story-reels-media-${username}`, result);
        return result;
    },
    // Ports instagrapi's user_search: GET users/search/?query=<username>
    async search(session, username) {
        const result = await (0, login_1.privateRequest)(session, "users/search/", {
            params: { query: username, count: "30" },
        });
        saveFixture(`search-${username}`, result);
        return result;
    },
};
async function main() {
    const [, , command, arg] = process.argv;
    if (!command || !arg || !commands[command]) {
        console.log("Usage: node dist/fetch-fixtures.js <profile|media|story|search> <username-or-shortcode>");
        process.exitCode = 1;
        return;
    }
    const cached = loadCachedSession();
    let session;
    let alreadyLoggedInFresh;
    if (cached) {
        console.log(`Using cached session (user id ${cached.userId}, saved ${cached.savedAt}).`);
        session = cached;
        alreadyLoggedInFresh = false;
    }
    else {
        session = await freshLogin();
        alreadyLoggedInFresh = true;
    }
    console.log(`Fetching ${command} ${arg}...`);
    let result = await commands[command](session, arg);
    if (isAuthError(result.status) && !alreadyLoggedInFresh) {
        console.log(`Cached session looks expired/invalid (HTTP ${result.status}); logging in again...`);
        session = await freshLogin();
        result = await commands[command](session, arg);
    }
}
main().catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
});
