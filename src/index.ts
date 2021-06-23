
import { Program } from './App';
import { MediaScanner } from './modules/MediaScanner';
import { ProfilePageDownload } from './modules/ProfilePageDownload';
import { Modal } from './components/Modal';
import Update from './modules/Update';
import localize from './helpers/localize';

console.clear();

const program: Program = {
    VERSION: process.env.VERSION as string,

    hostname: window.location.hostname,
    path: window.location.pathname,

    regexHostname: /instagram\.com/,
    regexRootPath: /^\/+$/,
    regexProfilePath: /^\/([A-Za-z0-9._]{2,3})+\/$/,
    regexPostPath: /^\/p\//,
    regexStoriesURI: /stories\/(.*)+/,

    foundByModule: null,
    foundVideo: false,
    foundImage: false
}

if (process.env.DEV) {
    console.info(['Developer Mode Caution!', program]);
}

/* ===============================
 =            Program            =
 ===============================*/
// verify if are running on instagram site
if (program.regexHostname.test(program.hostname)) {

    new MediaScanner().execute(program, function (found: boolean, scannerProgram: Program) {
        if (found == false) {
            // Profile page -> instagram.com/instagram/
            if (scannerProgram.regexProfilePath.test(scannerProgram.path)) {
                new ProfilePageDownload().execute(scannerProgram, function (profilePageDownload: boolean, profilePageDownloadProgram: Program) {
                    if (process.env.DEV) {
                        console.log('profilePageDownload', profilePageDownload);
                    }

                    if (profilePageDownload == false) {
                        new Modal({
                            heading: [
                                `<h5>[instantgram] <span style="float:right">v${profilePageDownloadProgram.VERSION}</span></h5>`
                            ],
                            content: [
                                localize('index#program#profilePageDownload@cannot_download')
                            ],
                            contentStyle: 'text-align:center',
                            buttonList: [{
                                active: true,
                                text: 'Ok'
                            }]
                        }).open();
                    }
                });
            }
        }

        if (typeof scannerProgram.foundVideo !== 'undefined' && scannerProgram.foundByModule == undefined) {
            if (process.env.DEV) {
                console.log('foundVideo', scannerProgram.foundVideo);
                console.log('foundImage', scannerProgram.foundImage);
                console.log('foundByModule', scannerProgram.foundByModule);
            }

            program.foundVideo = scannerProgram.foundVideo;
            program.foundImage = scannerProgram.foundImage;
            program.foundByModule = scannerProgram.foundByModule;

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
                }).open();
            }
        }
    });

    // In due of Access control it only works when using on instagram
    Update(program.VERSION);
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
    }).open();
}
/* =====  End of Program  ======*/