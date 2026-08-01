import { Program } from "../App";
import { h } from "preact";
import { Modal } from "../components/modal";
import { UpdateModalBody } from "../components/updateModal";
import { findAppId, mediaInfoUrlPrefix, shortcodeToMediaId, secureFetch } from "../helpers/instagramApi";
import localize from "../helpers/localize";
import { normalizeVersionString } from "../helpers/common";

const FIREFOX_LITE = process.env.FIREFOX_LITE as unknown as boolean ?? false;

type Changelog = {
    date: string;
    textBody: string;
};

// Chosen once at module scope (mirroring the pattern already used for the .ium CSS block
// in modalStyles.ts) so the Firefox Lite build can prove the Modal/UpdateModalBody branch
// is unreachable and drop it -- a conditional buried inside a class method's if/else
// wasn't reliably eliminated by the bundler.
const notifyUpdateAvailable: (localVersion: string, onlineVersion: string, changelogText: string, versionLine: string) => void = FIREFOX_LITE
    ? (_localVersion, _onlineVersion, _changelogText, versionLine) => alert(localize("u.i")+"\n"+versionLine)
    : (localVersion, onlineVersion, changelogText) => {
        new Modal({
            heading: "",
            body: h(UpdateModalBody, { localVersion, onlineVersion, text: changelogText }),
            bodyStyle: "padding:0!important",
            modalClassName: "ium",
            buttonList: [{ active: true, text: "", localizationKey: "c" }],
        }).open();
    };

export class VersionUpdater {
    program: Program;
    storageKey: string;
    private readonly changelogPostShortcode = "DYigGqejL3X";

    constructor(program: Program) {
        this.program = program;
        this.storageKey = program.STORAGE_NAME;
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
        const failedPrefix = "Failed to fetch changelog: ";
        const appId = findAppId();
        const mediaId = shortcodeToMediaId(this.changelogPostShortcode);
        if (!appId || !mediaId) {
            console.error(failedPrefix+"missing Instagram App ID or media ID");
            return null;
        }
        const text = (await secureFetch(mediaInfoUrlPrefix+mediaId+"/info/", appId))
            ?.items?.[0]?.caption?.text;
        if (!text) {
            console.error(failedPrefix+"caption text missing");
            return null;
        }
        const [date, textBody] = text.split("::");
        if (!date || !textBody) {
            console.error(failedPrefix+"invalid caption format");
            return null;
        }
        return { date, textBody };
    }

    private processChangelog(localVersion: string, { date, textBody }: Changelog): void {
        const onlineVersion = normalizeVersionString(date);
        const normalizedLocalVersion = normalizeVersionString(localVersion);
        console.info(localize("modules.update@update_successful"));

        if (new Date(onlineVersion) > new Date(normalizedLocalVersion)) {
            const versionLine = localize("u.v")
                .replace("%version%", normalizedLocalVersion)
                .replace("%onlineVersion%", onlineVersion);
            notifyUpdateAvailable(normalizedLocalVersion, onlineVersion, textBody, versionLine);
            console.warn(localize("u.i"));
            console.warn(versionLine);
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
}

export default VersionUpdater;
