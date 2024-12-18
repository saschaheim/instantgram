import { Program } from "../App";
import { Modal } from "../components/Modal";
import { logo } from "../components/Interconnect";
import localize from "../helpers/localize";
import { MediaScanner } from "./MediaScanner";

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
    }

    /**
     * Fetches the changelog from an external API.
     * This method extracts the changelog date and text from the API response.
     * @returns {Promise<Changelog | null>} The fetched changelog data or null if the fetch fails.
     */
    private async fetchChangelog(): Promise<Changelog | null> {
        try {
            const response = await fetch(
                "https://www.instagram.com/graphql/query/?query_hash=003056d32c2554def87228bc3fd9668a&variables={%22id%22:45039295328,%22first%22:100}"
            );
            const json = await response.json();

            // Parse the changelog data from the API response
            const text = json.data.user.edge_owner_to_timeline_media.edges[0].node.edge_media_to_caption.edges[0].node.text;
            const [date, textBody] = text.split("::");
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
        // Generate the HTML list from the changelog text body
        const ulHtml = this.generateHtmlListFromText(textBody);

        // Check if the online version is greater than the local version
        const onlineVersion = date;

        // Log a success message
        console.info(localize("modules.update@update_successful"));

        if (new Date(onlineVersion) > new Date(localVersion)) {
            // If an update is available, show the update modal
            this.showUpdateModal(localVersion, onlineVersion, ulHtml);
            // Inform the developer about the outdated version in the console
            this.informOutdatedVersionInDevConsole();
        }
    }

    /**
     * Generates an HTML list from the given changelog text.
     * The text is split into sentences and each sentence is added as an item in the list.
     * @param text The changelog text to convert into an HTML list.
     * @returns {string} The generated HTML list as a string.
     */
    private generateHtmlListFromText(text: string): string {
        const sentences = text.split(/[.!?]/).filter(sentence => sentence.trim() !== ""); // Split text into sentences
        const ul = sentences.reduce((list, sentence) => list + `<li>${sentence.trim()}</li>`, "<ul style='padding: 20px;'>");
        return ul + "</ul>"; // Return the HTML list
    }

    /**
     * Stores version information in localStorage for future reference.
     * @param localVersion The current local version of the program.
     * @param onlineVersion The online version of the program.
     */
    private storeVersionInfo(localVersion: string, onlineVersion: string): void {
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 6); // Set expiration to 6 hours later

        // Store version info in an object
        const versionInfo = {
            version: localVersion,
            onlineVersion,
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
        const installedVersion = new Date(localVersion);
        const latestOnlineVersion = new Date(onlineVersion);

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
        const mS = new MediaScanner(); // Create a new MediaScanner instance

        // Open the modal with the changelog details
        new Modal({
            heading: [`<h5><span class="header-text-left">${logo}</span><span class="header-text-right">v${localVersion}</span></h5>`],
            body: [`<div>Update available v${onlineVersion}</div><div>${changelogHtml}</div>`],
            buttonList: [{ active: true, text: "Ok" }],
            callback: (_modal, el) => {
                // Set up a click listener on the settings button to open the settings menu
                el.querySelector(`.${this.program.NAME}-settings`).addEventListener("click", () => {
                    mS.handleSettingsButtonClick(this.program);
                });
            },
        }).open();
    }

    /**
     * Logs a warning in the developer console about the outdated version of the program.
     */
    private informOutdatedVersionInDevConsole(): void {
        const data = JSON.parse(window.localStorage.getItem(this.storageKey) || "{}");

        // Log a warning about the outdated version
        console.warn(localize("consoleWarnOutdatedInfo"));
        console.warn(
            localize("consoleWarnOutdatedVersions")
                .replace("${data.version}", data.version)
                .replace("${data.onlineVersion}", data.onlineVersion)
        );
    }
}

// Export the VersionUpdater class as the default export
export default VersionUpdater;