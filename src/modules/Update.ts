import { Program } from "../App"
import { Modal } from "../components/Modal"
import localize from "../helpers/localize"

type Changelog = {
    date: string  // Represents the date of the changelog or version release
    textBody: string  // Detailed text of the changelog
}

export class VersionUpdater {
    program: Program
    storageKey: string
    constructor(program) {
        this.program = program
        this.storageKey = `${program.STORAGE_NAME}`
    }

    public async update(localVersion: string): Promise<void> {
        if (this.isUpdateNecessary(localVersion)) {
            const changelog = await this.fetchChangelog()
            if (changelog) {
                this.processChangelog(localVersion, changelog)
            }
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

        this.storeVersionInfo(localVersion, onlineVersion)
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

    private isUpdateNecessary(localVersion: string): boolean {
        const data = JSON.parse(window.localStorage.getItem(this.storageKey) || "{}")
        const installedVersion = new Date(localVersion)
        const onlineVersion = new Date(data.onlineVersion)
        const isVersionOutdated = onlineVersion > installedVersion
        const isDataExpired = Date.now() > data.dateExpiration

        return isVersionOutdated || isDataExpired || !data
    }

    private showUpdateModal(localVersion: string, onlineVersion: string, changelogHtml: string): void {
        new Modal({
            heading: [`<h5><span class="header-text-left">[${this.program.NAME}]</span><span class="header-text-right" style="margin-right: 0">v${localVersion}</span></h5>`],
            body: [`<div>Update available v${onlineVersion}</div><div>${changelogHtml}</div>`],
            buttonList: [{ active: true, text: "Ok" }]
        }).open()
    }

    private informOutdatedVersionInDevConsole(): void {
        const data = JSON.parse(window.localStorage.getItem(this.storageKey) || "{}")
        console.warn(localize("modules.update@consoleWarnOutdatedInfo"))
        console.warn(
            localize("modules.update@consoleWarnOutdatedInfoVersions")
                .replace("${data.version}", data.version)
                .replace("${data.onlineVersion}", data.onlineVersion)
        )
    }
}
export default VersionUpdater