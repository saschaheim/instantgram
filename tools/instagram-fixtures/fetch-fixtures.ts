import * as fs from "fs";
import * as path from "path";
import { loginWithPassword } from "./login";

/**
 * CLI to log in (see login.ts) and fetch the same endpoints
 * src/helpers/instagramApi.ts calls from the browser, saving the raw
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
 */

// Matches the web app id src/helpers/instagramApi.ts sends for these same
// endpoints -- NOT the Android app id used only for the login request.
const WEB_APP_ID = "936619743392459";

const shortcodeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

// Mirrors src/helpers/instagramApi.ts's shortcodeToMediaId. Duplicated here
// (instead of imported) because this tool has its own Node-only tsconfig,
// while the source file's types assume a DOM/browser environment.
const shortcodeToMediaId = (shortcode: string): string | null => {
    let mediaId = 0n;
    for (const char of shortcode) {
        const index = shortcodeAlphabet.indexOf(char);
        if (index === -1) return null;
        mediaId = mediaId * 64n + BigInt(index);
    }
    return mediaId.toString();
};

type Credentials = { username: string; password: string };

// __dirname is tools/instagram-fixtures/dist/ once compiled; credentials.json
// lives one level up, alongside credentials.example.json.
const loadCredentials = (): Credentials => {
    const credentialsPath = path.join(__dirname, "..", "credentials.json");
    if (!fs.existsSync(credentialsPath)) {
        console.error(
            `Missing ${credentialsPath}.\n` +
            "Copy credentials.example.json to credentials.json and fill in your own Instagram username/password " +
            "(this file is gitignored and must never be committed)."
        );
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
};

const fetchAsSession = async (url: string, sessionId: string): Promise<{ status: number; body: unknown }> => {
    const response = await fetch(url, {
        headers: {
            Accept: "*/*",
            "X-IG-App-ID": WEB_APP_ID,
            Cookie: `sessionid=${sessionId}`,
        },
    });
    return { status: response.status, body: await response.json().catch(() => null) };
};

const saveFixture = (name: string, result: { status: number; body: unknown }): void => {
    const outputDir = path.join(__dirname, "..", "output");
    fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 4));
    console.log(`Saved ${filePath} (HTTP ${result.status})`);
};

const commands: Record<string, (sessionId: string, arg: string) => Promise<void>> = {
    async profile(sessionId, username) {
        const result = await fetchAsSession(
            `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
            sessionId
        );
        saveFixture(`profile-web-info-${username}`, result);
    },

    async media(sessionId, shortcode) {
        const mediaId = shortcodeToMediaId(shortcode);
        if (!mediaId) {
            throw new Error(`Could not convert shortcode "${shortcode}" to a media id.`);
        }
        const result = await fetchAsSession(`https://i.instagram.com/api/v1/media/${mediaId}/info/`, sessionId);
        saveFixture(`media-info-${shortcode}`, result);
    },

    async story(sessionId, username) {
        const profile = await fetchAsSession(
            `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
            sessionId
        );
        const userId = (profile.body as any)?.data?.user?.id;
        if (!userId) {
            saveFixture(`story-web-profile-info-${username}`, profile);
            throw new Error(`Could not resolve a user id for @${username}; saved the profile lookup for inspection.`);
        }
        const result = await fetchAsSession(`https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${userId}`, sessionId);
        saveFixture(`story-reels-media-${username}`, result);
    },

    async search(sessionId, username) {
        const result = await fetchAsSession(
            `https://www.instagram.com/web/search/topsearch/?query=${encodeURIComponent(username)}`,
            sessionId
        );
        saveFixture(`search-${username}`, result);
    },
};

async function main(): Promise<void> {
    const [, , command, arg] = process.argv;
    if (!command || !arg || !commands[command]) {
        console.log("Usage: node dist/fetch-fixtures.js <profile|media|story|search> <username-or-shortcode>");
        process.exitCode = 1;
        return;
    }

    const { username, password } = loadCredentials();
    console.log(`Logging in as ${username}...`);
    const session = await loginWithPassword(username, password);
    console.log(`Logged in (user id ${session.userId}). Fetching ${command} ${arg}...`);
    await commands[command](session.sessionId, arg);
}

main().catch(err => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
});
