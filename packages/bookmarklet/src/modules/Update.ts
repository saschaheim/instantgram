import { Program } from "../App";
import { h } from "preact";
import { Modal } from "../components/Modal";
import { UpdateModalBody } from "../components/updateModal";
import { findAppId, shortcodeToMediaId, secureFetch } from "../helpers/instagramApi";
import localize from "../helpers/localize";
import { normalizeVersionString } from "../helpers/common";

type Changelog = {
    date: string;
    textBody: string;
};

export class VersionUpdater {
    program: Program;
    storageKey: string;
    private readonly changelogPostShortcode = "DYigGqejL3X";

    constructor(program: Program) {
        this.program = program;
        this.storageKey = `${program.STORAGE_NAME}`;
    }

    public async check(localVersion: string): Promise<void> {
        const changelog = await this.fetchChangelog();
        const onlineVersion = changelog?.date || localVersion;
        this.storeVersionInfo(localVersion, onlineVersion);
        if (changelog && this.isUpdateNecessary(localVersion, onlineVersion)) {
            this.processChangelog(localVersion, changelog);
        } else {
            console.info(`[${this.program.NAME}] No update required`);
        }
    }

    private async fetchChangelog(): Promise<Changelog | null> {
        const appId = findAppId();
        const mediaId = shortcodeToMediaId(this.changelogPostShortcode);
        if (!appId || !mediaId) {
            console.error("Failed to fetch changelog: missing Instagram App ID or media ID");
            return null;
        }
        const text = (await secureFetch(`https://i.instagram.com/api/v1/media/${mediaId}/info/`, appId))
            ?.items?.[0]?.caption?.text;
        if (!text) {
            console.error("Failed to fetch changelog: caption text missing");
            return null;
        }
        const [date, textBody] = text.split("::");
        if (!date || !textBody) {
            console.error("Failed to fetch changelog: invalid caption format");
            return null;
        }
        return { date, textBody };
    }

    private processChangelog(localVersion: string, { date, textBody }: Changelog): void {
        const onlineVersion = normalizeVersionString(date);
        const normalizedLocalVersion = normalizeVersionString(localVersion);
        console.info(localize("modules.update@update_successful"));

        if (new Date(onlineVersion) > new Date(normalizedLocalVersion)) {
            this.showUpdateModal(normalizedLocalVersion, onlineVersion, textBody);
            console.warn(localize("u.i"));
            console.warn(localize("u.v")
                .replace("%version%", normalizedLocalVersion)
                .replace("%onlineVersion%", onlineVersion));
        }
    }

    private storeVersionInfo(localVersion: string, onlineVersion: string): void {
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 6);
        const normalizedLocalVersion = normalizeVersionString(localVersion);
        const normalizedOnlineVersion = normalizeVersionString(onlineVersion);

        const versionInfo = {
            version: normalizedLocalVersion,
            onlineVersion: normalizedOnlineVersion,
            lastVerification: Date.now(),
            dateExpiration: expirationDate.getTime(),
        };

        localStorage.setItem(this.storageKey, JSON.stringify(versionInfo));
    }

    private isUpdateNecessary(localVersion: string, onlineVersion: string): boolean {
        const data = JSON.parse(localStorage.getItem(this.storageKey) || "{}");
        const installedVersion = new Date(normalizeVersionString(localVersion));
        const latestOnlineVersion = new Date(normalizeVersionString(onlineVersion));

        const isVersionOutdated = latestOnlineVersion > installedVersion;
        const isDataExpired = Date.now() > data.dateExpiration;

        return isVersionOutdated || isDataExpired || !data;
    }

    private showUpdateModal(localVersion: string, onlineVersion: string, changelogText: string): void {
        new Modal({
            heading: "",
            body: h(UpdateModalBody, { localVersion, onlineVersion, text: changelogText }),
            bodyStyle: "padding:0!important",
            modalClassName: "ium",
            buttonList: [{ active: true, text: "", localizationKey: "c" }],
        }).open();
    }
}

export default VersionUpdater;
