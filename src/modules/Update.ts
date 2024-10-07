import { Program } from "../App"
import { Modal } from "../components/Modal"
import { logo } from "../components/Interconnect"
import localize from "../helpers/localize"
import { MediaScanner } from "./MediaScanner"

type Changelog = {
    date: string  // Represents the date of the changelog or version release
    textBody: string  // Detailed text of the changelog
}

export class VersionUpdater {
    program: Program
    storageKey: string
    constructor(program: Program) {
        this.program = program
        this.storageKey = `${program.STORAGE_NAME}`
    }

    public async check(localVersion: string): Promise<void> {
        const changelog = await this.fetchChangelog()
        const onlineVersion = changelog?.date || localVersion

        this.storeVersionInfo(localVersion, onlineVersion)

        if (this.isUpdateNecessary(localVersion, onlineVersion)) {
            if (changelog) {
                this.processChangelog(localVersion, changelog)
            }
        } else {
            console.info(`[${this.program.NAME}] No update required`)
        }
    }

    private async fetchChangelog(): Promise<Changelog | null> {
        try {
            const response = await fetch(
                "https://www.instagram.com/graphql/query/?query_hash=003056d32c2554def87228bc3fd9668a&variables={%22id%22:45039295328,%22first%22:100}"
            )
            const json = await response.json()
            const text = json.data.user.edge_owner_to_timeline_media.edges[0].node.edge_media_to_caption.edges[0].node.text
            const [date, textBody] = text.split("::")
            return { date, textBody }
        } catch (error) {
            console.error("Failed to fetch changelog: ", error)
            return null
        }
    }

    private processChangelog(localVersion: string, { date, textBody }: Changelog): void {
        const ulHtml = this.generateHtmlListFromText(textBody)
        const onlineVersion = date

        console.info(localize("modules.update@update_successful"))

        if (new Date(onlineVersion) > new Date(localVersion)) {
            this.showUpdateModal(localVersion, onlineVersion, ulHtml)
            this.informOutdatedVersionInDevConsole()
        }
    }

    private generateHtmlListFromText(text: string): string {
        const sentences = text.split(/[.!?]/).filter(sentence => sentence.trim() !== "")
        const ul = sentences.reduce((list, sentence) => list + `<li>${sentence.trim()}</li>`, "<ul style='padding: 20px;'>")
        return ul + "</ul>"
    }

    private storeVersionInfo(localVersion: string, onlineVersion: string): void {
        const expirationDate = new Date()
        expirationDate.setHours(expirationDate.getHours() + 6) // Set expiration to 6 hours later

        const versionInfo = {
            version: localVersion,
            onlineVersion,
            lastVerification: Date.now(),
            dateExpiration: expirationDate.getTime()
        }

        window.localStorage.setItem(this.storageKey, JSON.stringify(versionInfo))
    }

    private isUpdateNecessary(localVersion: string, onlineVersion: string): boolean {
        const data = JSON.parse(window.localStorage.getItem(this.storageKey) || "{}")
        const installedVersion = new Date(localVersion)
        const latestOnlineVersion = new Date(onlineVersion)
        const isVersionOutdated = latestOnlineVersion > installedVersion
        const isDataExpired = Date.now() > data.dateExpiration

        return isVersionOutdated || isDataExpired || !data
    }

    private showUpdateModal(localVersion: string, onlineVersion: string, changelogHtml: string): void {
        const mS = new MediaScanner()

        new Modal({
            heading: [`<h5><span class="header-text-left">${logo}</span><span class="header-text-right">v${localVersion}</span></h5>`],
            body: [`<div>Update available v${onlineVersion}</div><div>${changelogHtml}</div>`],
            buttonList: [{ active: true, text: "Ok" }],
            callback: (_modal, el) => {
                el.querySelector(`.${this.program.NAME}-settings`).addEventListener("click", () => {
                    mS.handleSettingsButtonClick(this.program)
                })
            }
        }).open()
    }

    private informOutdatedVersionInDevConsole(): void {
        const data = JSON.parse(window.localStorage.getItem(this.storageKey) || "{}")
        console.warn(localize("consoleWarnOutdatedInfo"))
        console.warn(
            localize("consoleWarnOutdatedVersions")
                .replace("${data.version}", data.version)
                .replace("${data.onlineVersion}", data.onlineVersion)
        )
    }
}
export default VersionUpdater