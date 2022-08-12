import { Program } from './App'
import { MediaScanner } from './modules/MediaScanner'
//import { ProfilePageDownload } from './modules/ProfilePageDownload'
import { Modal } from './components/Modal'
import Update from './modules/Update'
import localize from './helpers/localize'

console.clear()

const program: Program = {
    VERSION: process.env.VERSION as string,

    hostname: window.location.hostname,
    path: window.location.pathname,

    regexHostname: /^instagram\.com/,
    regexRootPath: /^\/+$/,
    regexProfilePath: /^\/([A-Za-z0-9._]{2,3})+\/$/,
    regexPostPath: /^\/p\//,
    regexStoriesURI: /stories\/(.*)+/,

    foundByModule: null,
    foundVideo: false,
    foundImage: false,
    foundProfile: false
}

if (process.env.DEV) {
    console.info(['Developer Mode Caution!', program])
}

/* ===============================
 =            Program            =
 ===============================*/
// verify if are running on instagram site
if (program.hostname == 'instagram.com' || program.hostname == 'www.instagram.com') {
    new MediaScanner().execute(program, function (scannerFound: boolean, foundMediaURL: string, scannerProgram: Program) {
        program.foundVideo = scannerProgram.foundVideo
        program.foundImage = scannerProgram.foundImage
        program.foundByModule = scannerProgram.foundByModule

        if (process.env.DEV) {
            console.log('scannerFound', scannerFound)
            console.log('foundVideo', program.foundVideo)
            console.log('foundImage', program.foundImage)
            console.log('foundByModule', program.foundByModule)
        }

        if (scannerFound == false) {
            if (scannerProgram.regexProfilePath.test(scannerProgram.path)) {
                program.foundByModule = 'CUSTOM'

                new Modal({
                    heading: [
                        `<h5>[instantgram] ProfilePage downloader <span style="float:right">v${program.VERSION}</span></h5>`
                    ],
                    content: [
                        localize('index@profilepage_downloader_disabled')
                    ],
                    contentStyle: 'text-align:center',
                    buttonList: [{
                        active: true,
                        text: 'Ok'
                    }]
                }).open()
            }
        }

        if (scannerFound && foundMediaURL !== null) {
            if (process.env.DEV) {
                console.log('foundMediaURL', foundMediaURL)
            }
            window.open(foundMediaURL)
        }

        if (program.foundByModule == undefined) {
            if (!process.env.DEV) {
                if (program.foundVideo == false && program.foundImage == false) {
                    new Modal({
                        heading: [
                            `<h5>[instantgram] <span style="float:right">v${program.VERSION}</span></h5>`
                        ],
                        content: [
                            localize('index#program@alert_dontFound')
                        ],
                        contentStyle: 'text-align:center',
                        buttonList: [{
                            active: true,
                            text: 'Ok'
                        }]
                    }).open()
                }
            }
        }
    })
} else {
    new Modal({
        heading: [
            `<h5>[instantgram] <span style="float:right">v${program.VERSION}</span></h5>`
        ],
        content: [
            localize('index@alert_onlyWorks')
        ],
        contentStyle: 'text-align:center',
        buttonList: [{
            active: true,
            text: 'Ok'
        }]
    }).open()
}
// Check everytime for an update on calling this
if (!process.env.DEV) {
    Update(program.VERSION)
}
/* =====  End of Program  ======*/