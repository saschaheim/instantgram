import { Program } from "../App";
import { Modal } from "../components/Modal";
import { findAppId, shortcodeToMediaId, secureFetch } from "../helpers/instagramApi";
import localize from "../helpers/localize";
import { formatVersionLabel, normalizeVersionString } from "../helpers/common";

type Changelog = {
    date: string;
    textBody: string;
};

export class VersionUpdater {
    program: Program;
    storageKey: string;
    private checkPromise: Promise<void> | null = null;
    private readonly changelogPostShortcode = "DYigGqejL3X";

    constructor(program: Program) {
        this.program = program;
        this.storageKey = `${program.STORAGE_NAME}`;
    }

    public async check(localVersion: string): Promise<void> {
        if (this.checkPromise) {
            return this.checkPromise;
        }

        this.checkPromise = (async () => {
            const changelog = await this.fetchChangelog();
            const onlineVersion = changelog?.date || localVersion;

            this.storeVersionInfo(localVersion, onlineVersion);

            if (this.isUpdateNecessary(localVersion, onlineVersion)) {
                if (changelog) {
                    this.processChangelog(localVersion, changelog);
                }
            } else {
                console.info(`[${this.program.NAME}] No update required`);
            }
        })();

        try {
            await this.checkPromise;
        } finally {
            this.checkPromise = null;
        }
    }

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

            return { date, textBody };
        } catch (error) {
            console.error("Failed to fetch changelog: ", error);
            return null;
        }
    }

    private processChangelog(localVersion: string, { date, textBody }: Changelog): void {
        const changelogHtml = this.generateChangelogHtml(textBody);
        const onlineVersion = normalizeVersionString(date);
        const normalizedLocalVersion = normalizeVersionString(localVersion);

        console.info(localize("modules.update@update_successful"));

        if (new Date(onlineVersion) > new Date(normalizedLocalVersion)) {
            this.showUpdateModal(normalizedLocalVersion, onlineVersion, changelogHtml);
            this.informOutdatedVersionInDevConsole();
        }
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    private formatInlineMarkup(text: string): string {
        const escaped = this.escapeHtml(text);

        return escaped
            .replace(/`([^`]+)`/g, "<code style=\"font-family:Consolas,Monaco,monospace;font-size:.95em;background:#f3f6f9;color:#234;padding:2px 6px;border-radius:6px\">$1</code>")
            .replace(/\*\*([^*]+)\*\*/g, "<strong style=\"font-weight:700;color:#111\">$1</strong>");
    }

    private generateChangelogHtml(text: string): string {
        const lines = text.split("\n").map(line => line.trim());
        const introParts: string[] = [];
        const detailItems: string[] = [];
        let items = "";
        let introCaptured = false;

        const flushItems = () => {
            if (!items) {
                return;
            }
            detailItems.push(items);
            items = "";
        };

        lines.forEach(line => {
            if (!line) {
                flushItems();
                return;
            }

            if (/^[-*]\s+/.test(line)) {
                items += `<li style="position:relative;margin:0 0 12px;padding:0 0 0 18px;line-height:1.62;color:#24323d"><span style="position:absolute;left:0;top:.58em;width:7px;height:7px;border-radius:999px;background:linear-gradient(135deg,#4b8db5 0%,#6ea8c8 100%)"></span>${this.formatInlineMarkup(line.slice(2))}</li>`;
                introCaptured = true;
                return;
            }

            flushItems();

            const isStandaloneHeading = /^\*\*.+\*\*$/.test(line);
            const cleanLine = this.formatInlineMarkup(line);

            if (!introCaptured && isStandaloneHeading) {
                introParts.push(`<p style="margin:0;font-size:18px;font-weight:800;line-height:1.25;letter-spacing:-.02em;color:#101820">${cleanLine}</p>`);
                introCaptured = true;
                return;
            }

            items += `<li style="position:relative;margin:0 0 12px;padding:0 0 0 18px;line-height:1.62;color:#24323d"><span style="position:absolute;left:0;top:.58em;width:7px;height:7px;border-radius:999px;background:#6ea8c8"></span>${cleanLine}</li>`;
            introCaptured = true;
        });

        flushItems();

        const detailsHtml = detailItems.length > 0
            ? `<ul style="margin:0;padding:0;list-style:none;color:#202124">${detailItems.join("")}</ul>`
            : "";

        return `<div style="padding:26px 28px 18px;text-align:left;font-size:14px">
            <div style="padding:0 0 18px;margin:0 0 18px;border-bottom:1px solid #eef3f7">
                ${introParts.join("")}
            </div>
            <div>${detailsHtml}</div>
        </div>`;
    }

    private buildUpdateHeading(localVersion: string, onlineVersion: string): string {
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
            <div style="min-width:0;font-size:24px;font-weight:800;line-height:1.02;letter-spacing:-.03em;color:#fff">${localize("u.t")}</div>
            <div style="flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:8px 11px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.24);white-space:nowrap">
                <span style="font-size:12px;font-weight:700;color:#fff">${formatVersionLabel(localVersion)}</span>
                <span style="font-size:14px;font-weight:800;line-height:1;color:#fff">&rarr;</span>
                <span style="font-size:13px;font-weight:800;color:#fff">${formatVersionLabel(onlineVersion)}</span>
            </div>
        </div>`;
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

        window.localStorage.setItem(this.storageKey, JSON.stringify(versionInfo));
    }

    private isUpdateNecessary(localVersion: string, onlineVersion: string): boolean {
        const data = JSON.parse(window.localStorage.getItem(this.storageKey) || "{}");
        const installedVersion = new Date(normalizeVersionString(localVersion));
        const latestOnlineVersion = new Date(normalizeVersionString(onlineVersion));

        const isVersionOutdated = latestOnlineVersion > installedVersion;
        const isDataExpired = Date.now() > data.dateExpiration;

        return isVersionOutdated || isDataExpired || !data;
    }

    private showUpdateModal(localVersion: string, onlineVersion: string, changelogHtml: string): void {
        new Modal({
            heading: [this.buildUpdateHeading(localVersion, onlineVersion)],
            body: [changelogHtml],
            bodyStyle: "padding:0!important",
            modalClassName: "instg-update-modal",
            buttonList: [{ active: true, text: localize("c") }],
        }).open();
    }

    private informOutdatedVersionInDevConsole(): void {
        const data = JSON.parse(window.localStorage.getItem(this.storageKey) || "{}");

        console.warn(localize("u.i"));
        console.warn(
            localize("u.v")
                .replace("${data.version}", data.version)
                .replace("${data.onlineVersion}", data.onlineVersion)
        );
    }
}

export default VersionUpdater;
