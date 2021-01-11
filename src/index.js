import localize from './helpers/localize.js'
import picoModal from './helpers/picoModal.js'
import showNotFoundModal from './helpers/showNotFoundModal.js'
import update from './modules/update.js'

import searchVideoInFeed from './modules/searchVideoInFeed.js'
import searchImageVideoInStories from './modules/searchImageVideoInStories.js'
import searchVideoInPost from './modules/searchVideoInPost.js'
import searchVideoInModalPost from './modules/searchVideoInModalPost.js'
import searchImageInFeed from './modules/searchImageInFeed.js'
import searchImageInPost from './modules/searchImageInPost.js'
import searchImageInModalPost from './modules/searchImageInModalPost.js'

console.clear()

const program = {
    VERSION: VERSION,

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

    setImageLink: function(link) {
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
        //console.log('Root domain')

        searchVideoInFeed(program, function(vInFeed, vInFeedProgram) {
            if (DEV) {
                console.log('videoInFeed', vInFeed)
            }
            if (typeof vInFeedProgram.foundVideo !== "undefined" && typeof vInFeedProgram.foundByModule !== "undefined") {
                program.foundVideo = vInFeedProgram.foundVideo
                program.foundByModule = vInFeedProgram.foundByModule
            }

            if (vInFeed === false) {
                if (searchImageInFeed(program) === false) {
                    program.context.hasMsg = false
                }
            }
        })
    }

    // Stories -> instagram.com/stories/user name/id/
    if (program.regexStoriesURI.test(program.path)) {
        //console.log('Stories domain')

        if (searchImageVideoInStories(program) === false) {
            program.context.hasMsg = false
        }
    }

    // Post -> instagram.com/p/post id/
    if (program.regexPostPath.test(program.path)) {
        //console.log('Post domain')

        searchVideoInPost(program, function(vInPost, vInPostProgram) {
            if (DEV) {
                console.log('videoInPost', vInPost)
            }
            if (typeof vInPostProgram.foundVideo !== "undefined" && typeof vInPostProgram.foundByModule !== "undefined") {
                program.foundVideo = vInPostProgram.foundVideo
                program.foundByModule = vInPostProgram.foundByModule
            }

            if (vInPost === false) {
                if (searchImageInPost(program) === false) {
                    searchVideoInModalPost(program, function(vInModalPost, vInModalPostProgram) {
                        if (DEV) {
                            console.log('vInModalPost', vInModalPost)
                        }
                        if (typeof vInModalPostProgram.foundVideo !== "undefined" && typeof vInModalPostProgram.foundByModule !== "undefined") {
                            program.foundVideo = vInModalPostProgram.foundVideo
                            program.foundByModule = vInModalPostProgram.foundByModule
                        }

                        if (vInModalPost === false) {
                            if (searchImageInModalPost(program) === false) {
                                program.context.hasMsg = false
                            }
                        }
                    })
                }
            }
        })
    }

    if (DEV) {
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
            modal.modalElem().addEventListener("click", evt => {
                if (evt.target && evt.target.matches(".ok")) {
                    modal.close(true)
                }
            })
        }).afterClose((modal, evt) => {
            modal.destroy()
        }).show()
    }
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

update(program.VERSION)
/* =====  End of Program  ======*/