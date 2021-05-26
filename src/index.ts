import { Program } from './App'
import localize from './helpers/localize'
import picoModal from './helpers/picoModal'
import showNotFoundModal from './helpers/showNotFoundModal'
import Update from './modules/Update'
import { ImageVideoInStories } from './modules/ImageVideoInStories'
import { VideoInFeed } from './modules/VideoInFeed'
import { ImageInFeed } from './modules/ImageInFeed'
import { VideoInPost } from './modules/VideoInPost'
import { ImageInPost } from './modules/ImageInPost'
import { VideoInModalPost } from './modules/VideoInModalPost'
import { ImageInModalPost } from './modules/ImageInModalPost'

console.clear()

const program: Program = {
    VERSION: process.env.VERSION as string,

    context: {
        hasMsg: false,
        msg: ''
    },

    hostname: window.location.hostname,
    path: window.location.pathname,
    videos: document.querySelectorAll('video'),

    regexHostname: /instagram\.com/,
    regexRootPath: /^\/+$/,
    regexPostPath: /^\/p\//,
    regexStoriesURI: /stories\/(.*)+/,

    foundByModule: null,
    foundVideo: false,
    foundImage: false,
    imageLink: false,

    setImageLink: function (link) {
        this.imageLink = link
    }
}
/* ===============================
 =            Program            =
 ===============================*/
// verify if are running on instagram site
if (program.regexHostname.test(program.hostname)) {

    // Feed -> instagram.com/
    if (program.regexRootPath.test(program.path)) {
        if (process.env.DEV) {
            console.log('Root domain')
        }

        new VideoInFeed().execute(program, function (vInFeed: boolean, vInFeedProgram: Program) {
            if (process.env.DEV) {
                console.log('videoInFeed', vInFeed)
            }

            if (typeof vInFeedProgram.foundVideo !== 'undefined' && typeof vInFeedProgram.foundByModule !== 'undefined') {
                if (process.env.DEV) {
                    console.log('foundVideo', vInFeedProgram.foundVideo)
                    console.log('foundByModule', vInFeedProgram.foundByModule)
                }

                program.foundVideo = vInFeedProgram.foundVideo
                program.foundByModule = vInFeedProgram.foundByModule
            }

            if (vInFeed === false) {
                new ImageInFeed().execute(program, function (imgInFeed: boolean, imgInFeedProgram: Program) {
                    if (process.env.DEV) {
                        console.log('imageInFeed', imgInFeed)
                    }

                    if (typeof imgInFeedProgram.foundImage !== 'undefined' && typeof imgInFeedProgram.foundByModule !== 'undefined') {
                        if (process.env.DEV) {
                            console.log('foundImage', imgInFeedProgram.foundVideo)
                            console.log('foundByModule', imgInFeedProgram.foundByModule)
                        }

                        program.foundImage = imgInFeedProgram.foundVideo
                        program.foundByModule = imgInFeedProgram.foundByModule
                    }

                    if (imgInFeed === false) {
                        program.context.hasMsg = false
                    }
                })
            }
        })
    }

    // Stories -> instagram.com/stories/user name/id/
    if (program.regexStoriesURI.test(program.path)) {
        if (new ImageVideoInStories().execute(program).then(res => res === false ? true : false)) {
            program.context.hasMsg = false
        }
    }

    // Post -> instagram.com/p/post id/
    if (program.regexPostPath.test(program.path)) {
        if (process.env.DEV) {
            console.log('Post domain')
        }

        new VideoInPost().execute(program, function (vInPost: boolean, vInPostProgram: Program) {
            if (process.env.DEV) {
                console.log('videoInPost', vInPost)
            }

            if (typeof vInPostProgram.foundVideo !== 'undefined' && typeof vInPostProgram.foundByModule !== 'undefined') {
                if (process.env.DEV) {
                    console.log('foundVideo', vInPostProgram.foundVideo)
                    console.log('foundByModule', vInPostProgram.foundByModule)
                }

                program.foundVideo = vInPostProgram.foundVideo
                program.foundByModule = vInPostProgram.foundByModule
            }

            if (vInPost === false) {
                new VideoInModalPost().execute(program, function (vInModalPost: boolean, vInModalPostProgram: Program) {
                    if (process.env.DEV) {
                        console.log('videoInModalPost', vInModalPost)
                    }

                    if (typeof vInModalPostProgram.foundVideo !== 'undefined' && typeof vInModalPostProgram.foundByModule !== 'undefined') {
                        program.foundVideo = vInModalPostProgram.foundVideo
                        program.foundByModule = vInModalPostProgram.foundByModule
                    }

                    if (vInModalPost === false) {
                        new ImageInPost().execute(program, function (imgInPost: boolean, imgInPostProgram: Program) {
                            if (process.env.DEV) {
                                console.log('imageInPost', imgInPost)
                            }

                            if (typeof imgInPostProgram.foundImage !== 'undefined' && typeof imgInPostProgram.foundByModule !== 'undefined') {
                                if (process.env.DEV) {
                                    console.log('foundImage', imgInPostProgram.foundImage)
                                    console.log('foundByModule', imgInPostProgram.foundByModule)
                                }

                                program.foundImage = imgInPostProgram.foundImage
                                program.foundByModule = imgInPostProgram.foundByModule
                            }

                            if (imgInPost === false) {
                                new ImageInModalPost().execute(program, function (imgInModalPost: boolean, imgInModalPostProgram: Program) {
                                    if (process.env.DEV) {
                                        console.log('imageInModalPost', imgInModalPost)
                                    }

                                    if (typeof imgInModalPostProgram.foundImage !== 'undefined' && typeof imgInModalPostProgram.foundByModule !== 'undefined') {
                                        if (process.env.DEV) {
                                            console.log('foundImage', imgInModalPostProgram.foundImage)
                                            console.log('foundByModule', imgInModalPostProgram.foundByModule)
                                        }

                                        program.foundImage = imgInModalPostProgram.foundImage
                                        program.foundByModule = imgInModalPostProgram.foundByModule
                                    }

                                    if (imgInModalPost === false) {
                                        program.context.hasMsg = false
                                    }
                                })
                            }
                        })
                    }
                })
            }
        })
    }

    if (process.env.DEV) {
        console.info('Developer Mode Caution!', program)
    }

    if (!program.regexRootPath.test(program.path) && !program.regexStoriesURI.test(program.path) && !program.regexPostPath.test(program.path)) {
        showNotFoundModal(program)
    }

    if (program.context.hasMsg) {
        picoModal({
            width: 400,
            content: "<div style='padding:20px'><h4 style='font-weight:bold;margin-top:0'>[instantgram]<span style='float:right;'>v" + program.VERSION + "</span></h4><br/>" +
                "<p style='margin:0'>" + localize(program.context.msg) + "</p>" +
                "</div>" +
                "<div class='footer' style='display:block;bottom:0;background:#efefef;width:100%;left:0;padding:10px;box-sizing:border-box;margin:0;text-align:right;'>" +
                "<button class='ok' style='width:50px;cursor:pointer;'>Ok</button>" +
                "</div>"
        }).afterCreate(modal => {
            modal.modalElem().addEventListener('click', evt => {
                if (evt.target && evt.target.matches('.ok')) {
                    modal.close(true)
                }
            })
        }).afterClose((modal, evt) => {
            modal.destroy()
        }).show()
    }

    // In due of Access control it only works when using on instagram
    Update(program.VERSION)
} else {
    picoModal({
        width: 400,
        content: "<div style='padding:20px'><h4 style='font-weight:bold;margin-top:0'>[instantgram]<span style='float:right;'>v" + program.VERSION + "</span></h4>" +
            "<p style='margin:0'>" + localize('index@alert_onlyWorks') + "</p>" +
            "</div>" +
            "<div class='footer' style='display:block;bottom:0;background:#efefef;width:100%;left:0;padding:10px;box-sizing:border-box;margin:0;text-align:right;'>" +
            "<button class='ok' style='width:50px;cursor:pointer;'>Ok</button>" +
            "</div>"
    }).afterCreate(modal => {
        modal.modalElem().addEventListener('click', evt => {
            if (evt.target && evt.target.matches('.ok')) {
                modal.close(true)
            }
        })
    }).afterClose((modal, evt) => {
        modal.destroy()
    }).show()
}
/* =====  End of Program  ======*/