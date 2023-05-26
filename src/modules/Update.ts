import localize from "../helpers/localize"
import { Modal } from "../components/Modal"

interface InstantgramData {
    version: string
    onlineVersion: string
    lastVerification: number
    dateExpiration: number
}

function informOutdatedVersionInDevConsole(data: InstantgramData): void {
    console.warn(localize('modules.update@consoleWarnOutdatedInfo'))
    console.warn(
        localize('modules.update@consoleWarnOutdatedInfoVersions')
            .replace('${data.version}', data.version)
            .replace('${data.onlineVersion}', data.onlineVersion)
    )
}

function determineIfGetUpdateIsNecessary(localVersion: string): boolean {
    const data = window.localStorage.getItem('instantgram') as string

    if (typeof data === 'string') {
        const _data = JSON.parse(data) as InstantgramData

        // Sync installed version with localStorage
        window.localStorage.setItem(
            'instantgram',
            JSON.stringify({
                version: localVersion,
                onlineVersion: _data.onlineVersion,
                lastVerification: _data.lastVerification,
                dateExpiration: _data.dateExpiration,
            })
        )

        // compare versions cached
        const onlineVersion = new Date(_data.onlineVersion)
        const installedVersion = new Date(_data.onlineVersion)
        if (onlineVersion > installedVersion) {
            informOutdatedVersionInDevConsole(_data)
        }

        // compare date now with expiration
        if (Date.now() > _data.dateExpiration) {
            return true // must have update new informations from github
        } else {
            return false // have localStorage and is on the date
        }
    } else {
        return true // dont have localStorage
    }
}

async function update(localVersion: string): Promise<void> {
    if (determineIfGetUpdateIsNecessary(localVersion)) {
        const response = await fetch(
            'https://www.instagram.com/graphql/query/?query_hash=003056d32c2554def87228bc3fd9668a&variables={%22id%22:45423705413,%22first%22:100}'
        )
        const data = await response.json()
        const changelog = data.data.user.edge_owner_to_timeline_media.edges[1].node.edge_media_to_caption.edges[0].node.text

        const changelogSplitted = changelog.split("::")
        const changelogNewReleaseDate = changelogSplitted[0]
        const changelogText = changelogSplitted[1]

        // Generate unordered list
        const sentences = changelogText.split(/[.!?]/)
        let ul = '<ul style="padding: 20px;">'
        sentences.forEach((sentence) => {
            if (sentence.trim() !== '') {
                ul += `<li>${sentence.trim()}</li>`
            }
        })
        ul += '</ul>'

        const onlineVersion = changelogNewReleaseDate

        // verify update each 2 days
        const limitDate = new Date()
        limitDate.setTime(limitDate.getTime() + 6 * 60 * 60 * 1000)

        window.localStorage.setItem(
            'instantgram',
            JSON.stringify({
                version: localVersion,
                onlineVersion,
                lastVerification: Date.now(),
                dateExpiration: limitDate.valueOf(),
            })
        )

        console.info(localize('modules.update@determineIfGetUpdateIsNecessary_updated'))

        // if instagram post had a update, notify in console and in a modal
        const _onlineVersion = new Date(onlineVersion)
        const installedVersion = new Date(localVersion)
        if (_onlineVersion > installedVersion) {
            new Modal({
                heading: [`<h5>[instantgram] <span style="float:right">v${localVersion}</span></h5>`],
                body: [
                    `<div style='display: block;border: 2px solid rgb(0 0 0 / 70%);border-left: none;border-right: none;border-top: none;padding: 5px;font-variant: small-caps;font-weight: 900;font-size: 16px;'>Es ist ein neues Update verfügbar <span style='float:right'>v${onlineVersion}</span></div><div style='text-align:left'><h2 style='font-weight: bold;'><br>Changelog</h2>${ul}</div><a href='http://thinkbig-company.github.io/instantgram' target='_blank' onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='initial'" style='display: block; text-align: center;text-decoration: initial; margin: 0px auto; padding: 10px; color: black; border-style: solid; border-image-slice: 1; border-width: 3px; border-image-source: linear-gradient(to left, rgb(213, 58, 157), rgb(116, 58, 213));'>${localize('modules.update@determineIfGetUpdateIsNecessary_@load_update')}</a>`,
                ],
                buttonList: [
                    {
                        active: true,
                        text: 'Ok',
                    },
                ],
            }).open()

            const data = JSON.parse(window.localStorage.getItem('instantgram') as string)
            informOutdatedVersionInDevConsole(data)
        } else {
            console.info(window.localStorage.getItem('instantgram'))
        }
    }
}

export default update