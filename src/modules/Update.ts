import localize from "../helpers/localize"
import isSemVer from "../helpers/isSemVer"
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
    const data = window.localStorage.getItem('instantgram') as string;

    if (typeof data === 'string') {
        const _data = JSON.parse(data) as InstantgramData;

        // Sync installed version with localStorage
        window.localStorage.setItem(
            'instantgram',
            JSON.stringify({
                version: localVersion,
                onlineVersion: _data.onlineVersion,
                lastVerification: _data.lastVerification,
                dateExpiration: _data.dateExpiration,
            })
        );

        // compare versions cached
        if (isSemVer(_data.onlineVersion, `> ${_data.version}`)) {
            informOutdatedVersionInDevConsole(_data);
        }

        // compare date now with expiration
        if (Date.now() > _data.dateExpiration) {
            return true; // must have update new informations from github
        } else {
            return false; // have localStorage and is on the date
        }
    } else {
        return true; // dont have localStorage
    }
}

async function update(localVersion: string): Promise<void> {
    if (determineIfGetUpdateIsNecessary(localVersion)) {
        try {
            const response = await fetch(
                'https://www.instagram.com/graphql/query/?query_hash=003056d32c2554def87228bc3fd9668a&variables={%22id%22:45423705413,%22first%22:100}'
            );
            const data = await response.json();
            const changelog = data.data.user.edge_owner_to_timeline_media.edges[0].node.edge_media_to_caption.edges[0].node.text;
            const onlineVersion = changelog.match(/(\*|\d+(\.\d+){0,2}(\.\*)?)+/gm)[0];

            // verify update each 2 days
            const limitDate = new Date();
            limitDate.setTime(limitDate.getTime() + 6 * 60 * 60 * 1000);

            window.localStorage.setItem(
                'instantgram',
                JSON.stringify({
                    version: localVersion,
                    onlineVersion,
                    lastVerification: Date.now(),
                    dateExpiration: limitDate.valueOf(),
                })
            );

            console.info(localize('modules.update@determineIfGetUpdateIsNecessary_updated'));

            // if instagram post had a update, notify in console and in a modal
            if (isSemVer(onlineVersion, `> ${localVersion}`)) {
                new Modal({
                    heading: [`<h5>[instantgram] <span style="float:right">v${localVersion}</span></h5>`],
                    body: [
                        `<div style='display: block;border: 2px solid rgb(0 0 0 / 70%);border-left: none;border-right: none;border-top: none;padding: 5px;font-variant: small-caps;font-weight: 900;font-size: 16px;'>Es ist ein neues Update verfügbar <span style='float:right'>v${onlineVersion}</span></div>, "<br/>", "<br/>", <div style='text-align:left'><h2 style='font-weight: bold;'>Changelog</h2>${changelog.split('Changelog ')[1]}</div>, "<br/>", <a href='http://thinkbig-company.github.io/instantgram' target='_blank' onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='initial'" style='text-decoration: initial; margin: 0px auto; padding: 5px; color: black; border-style: solid; border-image-slice: 1; border-width: 3px; border-image-source: linear-gradient(to left, rgb(213, 58, 157), rgb(116, 58, 213));'>${localize('modules.update@determineIfGetUpdateIsNecessary_@load_update')}</a>`,
                    ],
                    buttonList: [
                        {
                            active: true,
                            text: 'Ok',
                        },
                    ],
                }).open();

                const data = JSON.parse(window.localStorage.getItem('instantgram') as string);
                informOutdatedVersionInDevConsole(data);
            } else {
                console.info(window.localStorage.getItem('instantgram'));
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

export default update