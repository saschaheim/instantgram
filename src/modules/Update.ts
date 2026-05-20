import { Program } from "../App";
import { Modal } from "../components/Modal";
import { logo } from "../components/Interconnect";
import { findAppId, shortcodeToMediaId, secureFetch } from "../helpers/instagramApi";
import localize from "../helpers/localize";

type Changelog = {
    date: string; // Represents the date of the changelog or version release
    textBody: string; // Detailed text of the changelog
};

/**
 * VersionUpdater is a class responsible for managing version updates.
 * It checks if the current version is outdated, fetches the changelog from an external source, 
 * and prompts the user with an update modal if an update is necessary.
 */
export class VersionUpdater {
    program: Program; // The program object containing configuration and context
    storageKey: string; // The key to store version info in localStorage
    private checkPromise: Promise<void> | null = null;
    private readonly changelogPostShortcode = "DYigGqejL3X";

    private normalizeVersionString(version: string): string {
        return version.replace(/^v/i, "").trim().replace(/\./g, "-");
    }

    /**
     * Constructor initializes the VersionUpdater with the given program configuration.
     * @param program The program object that contains configuration and context for the updater.
     */
    constructor(program: Program) {
        this.program = program;
        this.storageKey = `${program.STORAGE_NAME}`;
    }

    /**
     * Checks if an update is needed by comparing the local version and the online version.
     * It fetches the changelog and processes it if an update is required.
     * @param localVersion The current local version of the program.
     * @returns {Promise<void>} A promise indicating the completion of the check process.
     */
    public async check(localVersion: string): Promise<void> {
        if (this.checkPromise) {
            return this.checkPromise;
        }

        this.checkPromise = (async () => {
            // Fetch the changelog from an external source
            const changelog = await this.fetchChangelog();

            // If no changelog is found, default to the local version as the online version
            const onlineVersion = changelog?.date || localVersion;

            // Store the version information in localStorage
            this.storeVersionInfo(localVersion, onlineVersion);

            // Check if the update is necessary and process the changelog if required
            if (this.isUpdateNecessary(localVersion, onlineVersion)) {
                if (changelog) {
                    this.processChangelog(localVersion, changelog);
                }
            } else {
                // Log to the console if no update is required
                console.info(`[${this.program.NAME}] No update required`);
            }
        })();

        try {
            await this.checkPromise;
        } finally {
            this.checkPromise = null;
        }
    }

    /**
     * Fetches the changelog from an external API.
     * This method extracts the changelog date and text from the API response.
     * @returns {Promise<Changelog | null>} The fetched changelog data or null if the fetch fails.
     */
    private async fetchChangelog(): Promise<Changelog | null> {
        try {
            const appId = findAppId();
            if (!appId) {
                throw new Error("Instagram App ID not found");
            }

            const mediaId = shortcodeToMediaId(this.changelogPostShortcode);
            if (!mediaId) {
                throw new Error(`No media ID found for shortcode ${this.changelogPostShortcode}`);
            }

            const json = await secureFetch(`https://i.instagram.com/api/v1/media/${mediaId}/info/`, appId);
            const text = json?.items?.[0]?.caption?.text;
            if (!text) {
                throw new Error("No caption text found in media info response");
            }

            const [date, textBody] = text.split("::");
            if (!date || !textBody) {
                throw new Error("Caption does not match the expected changelog format");
            }

            return { date, textBody }; // Return the parsed changelog data
        } catch (error) {
            // Log any errors that occur during the fetch process
            console.error("Failed to fetch changelog: ", error);
            return null; // Return null if the fetch fails
        }
    }

    /**
     * Processes the changelog data and checks if an update is necessary.
     * If an update is available, it displays a modal with the changelog details.
     * @param localVersion The current local version of the program.
     * @param changelog The fetched changelog data.
     */
    private processChangelog(localVersion: string, { date, textBody }: Changelog): void {
        const changelogHtml = this.generateChangelogHtml(textBody);

        // Check if the online version is greater than the local version
        const onlineVersion = this.normalizeVersionString(date);
        const normalizedLocalVersion = this.normalizeVersionString(localVersion);

        // Log a success message
        console.info(localize("modules.update@update_successful"));

        if (new Date(onlineVersion) > new Date(normalizedLocalVersion)) {
            // If an update is available, show the update modal
            this.showUpdateModal(normalizedLocalVersion, onlineVersion, changelogHtml);
            // Inform the developer about the outdated version in the console
            this.informOutdatedVersionInDevConsole();
        }
    }

    /**
     * Escapes user-controlled text before inserting it into modal HTML.
     * @param text The changelog text to convert into an HTML list.
     * @returns {string} The escaped text.
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, "\\u0026amp;")
            .replace(/</g, "\\u003C")
            .replace(/>/g, "\\u003E")
            .replace(/"/g, "\\u0026quot;")
            .replace(/'/g, "\\u0026#39;");
    }

    /**
     * Formats a small markdown subset for the changelog modal.
     * Supported: **bold**, `code`, [label](https://example.com)
     * @param text Inline markdown text.
     * @returns {string} Safe HTML.
     */
    private formatInlineMarkdown(text: string): string {
        const tokens: string[] = [];
        let remaining = text;
        const patterns = [
            /\*\*([^*]+)\*\*/,
            /`([^`]+)`/,
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/,
        ];

        while (remaining.length > 0) {
            let earliestMatch: RegExpMatchArray | null = null;
            let earliestIndex = Infinity;
            let earliestPatternIndex = -1;

            patterns.forEach((pattern, patternIndex) => {
                const match = remaining.match(pattern);
                if (match && match.index !== undefined && match.index < earliestIndex) {
                    earliestMatch = match;
                    earliestIndex = match.index;
                    earliestPatternIndex = patternIndex;
                }
            });

            if (!earliestMatch || earliestIndex === Infinity) {
                tokens.push(this.escapeHtml(remaining));
                break;
            }

            if (earliestIndex > 0) {
                tokens.push(this.escapeHtml(remaining.slice(0, earliestIndex)));
            }

            if (earliestPatternIndex === 0) {
                tokens.push(`<strong>${this.escapeHtml(earliestMatch[1])}</strong>`);
            } else if (earliestPatternIndex === 1) {
                tokens.push(`<code style="background:#f5f5f5;padding:2px 5px;border-radius:4px;font-size:.92em">${this.escapeHtml(earliestMatch[1])}</code>`);
            } else {
                tokens.push(`<a href="${earliestMatch[2]}" target="_blank" rel="noopener noreferrer" style="color:#0095e2">${this.escapeHtml(earliestMatch[1])}</a>`);
            }

            remaining = remaining.slice(earliestIndex + earliestMatch[0].length);
        }

        return tokens.join("");
    }

    /**
     * Generates a cleaner changelog layout from caption text using a small markdown subset.
     * @param text The changelog text to convert into HTML.
     * @returns {string} The generated HTML block as a string.
     */
    private generateChangelogHtml(text: string): string {
        const lines = text.split("\n").map(line => line.trimEnd());
        const htmlParts: string[] = [];
        let listItems: string[] = [];

        const flushList = () => {
            if (listItems.length === 0) {
                return;
            }

            htmlParts.push(
                `<ul style="margin:0 0 16px;padding-left:24px;list-style:disc outside;color:#495057">
                    ${listItems.join("")}
                </ul>`
            );
            listItems = [];
        };

        lines.forEach((rawLine, index) => {
            const line = rawLine.trim();

            if (!line) {
                flushList();
                return;
            }

            if (/^[-*]\s+/.test(line)) {
                const content = line.replace(/^[-*]\s+/, "");
                listItems.push(`<li style="display:list-item;margin:0 0 8px 0;padding-left:2px">${this.formatInlineMarkdown(content)}</li>`);
                return;
            }

            flushList();

            if (/^#{1,3}\s+/.test(line)) {
                const level = Math.min((line.match(/^#+/)?.[0].length || 1) + 3, 6);
                const content = line.replace(/^#{1,3}\s+/, "");
                htmlParts.push(
                    `<h${level} style="margin:${index === 0 ? "0" : "10px"} 0 10px;font-size:16px;font-weight:700;line-height:1.35;color:#212529">
                        ${this.formatInlineMarkdown(content)}
                    </h${level}>`
                );
                return;
            }

            htmlParts.push(
                `<p style="margin:0 0 14px;color:#495057;line-height:1.6">
                    ${this.formatInlineMarkdown(line)}
                </p>`
            );
        });

        flushList();

        return `<div style="padding:18px 20px 8px;text-align:left">${htmlParts.join("")}</div>`;
    }

    /**
     * Stores version information in localStorage for future reference.
     * @param localVersion The current local version of the program.
     * @param onlineVersion The online version of the program.
     */
    private storeVersionInfo(localVersion: string, onlineVersion: string): void {
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 6); // Set expiration to 6 hours later
        const normalizedLocalVersion = this.normalizeVersionString(localVersion);
        const normalizedOnlineVersion = this.normalizeVersionString(onlineVersion);

        // Store version info in an object
        const versionInfo = {
            version: normalizedLocalVersion,
            onlineVersion: normalizedOnlineVersion,
            lastVerification: Date.now(),
            dateExpiration: expirationDate.getTime(),
        };

        // Save the version info in localStorage
        window.localStorage.setItem(this.storageKey, JSON.stringify(versionInfo));
    }

    /**
     * Checks if an update is necessary by comparing the local version and online version.
     * It also checks if the stored version data has expired.
     * @param localVersion The local version of the program.
     * @param onlineVersion The online version of the program.
     * @returns {boolean} True if an update is necessary, false otherwise.
     */
    private isUpdateNecessary(localVersion: string, onlineVersion: string): boolean {
        const data = JSON.parse(window.localStorage.getItem(this.storageKey) || "{}");
        const installedVersion = new Date(this.normalizeVersionString(localVersion));
        const latestOnlineVersion = new Date(this.normalizeVersionString(onlineVersion));

        // Check if the online version is newer or if the stored data has expired
        const isVersionOutdated = latestOnlineVersion > installedVersion;
        const isDataExpired = Date.now() > data.dateExpiration;

        return isVersionOutdated || isDataExpired || !data;
    }

    /**
     * Displays a modal informing the user of the update, with the changelog details.
     * @param localVersion The local version of the program.
     * @param onlineVersion The online version of the program.
     * @param changelogHtml The HTML representation of the changelog.
     */
    private showUpdateModal(localVersion: string, onlineVersion: string, changelogHtml: string): void {
        new Modal({
            heading: [`<h5>
                <span class="header-text-left">${logo}</span>
                <span class="header-text-middle">${localize("u.t")}</span>
                <span class="header-text-right">v${localVersion} -> v${onlineVersion.replace(/-/g, ".")}</span>
            </h5>`],
            body: [changelogHtml],
            bodyStyle: "padding:0!important",
            buttonList: [{ active: true, text: localize("c") }],
        }).open();
    }

    /**
     * Logs a warning in the developer console about the outdated version of the program.
     */
    private informOutdatedVersionInDevConsole(): void {
        const data = JSON.parse(window.localStorage.getItem(this.storageKey) || "{}");

        // Log a warning about the outdated version
        console.warn(localize("u.i"));
        console.warn(
            localize("u.v")
                .replace("${data.version}", data.version)
                .replace("${data.onlineVersion}", data.onlineVersion)
        );
    }
}

// Export the VersionUpdater class as the default export
export default VersionUpdater;
