import localize from '../helpers/localize.js'
import getBlobVideoUrl from '../helpers/getBlobVideoUrl.js'
import getLoadingDots from '../helpers/getLoadingDots.js'
import getPreLoader from '../helpers/getPreLoader.js'
import isElementInViewport from '../helpers/isElementInViewport.js'
import picoModal from '../helpers/picoModal.js'

export default function searchVideoInModalPost(program, callback) {
    var found = false

    if (program.regexPostPath.test(program.path)) {

        /* =====================================
         =      Search video in modal post     =
         ==================================== */
        try {
            searchVideo: { // eslint-disable-line no-labels

                /* Need this to predict different structures */
                let predictNeededElement = document.getElementsByTagName('article')
                let predictNeededElementIndex = 0
                if (predictNeededElement != null) {
                    for (predictNeededElementIndex = 0; predictNeededElementIndex < predictNeededElement.length; predictNeededElementIndex++) {
                        if (predictNeededElement[predictNeededElementIndex].classList.length >= 4) {
                            break
                        }
                    }
                }

                if (document.getElementsByTagName('article') != null && document.getElementsByTagName('article')[predictNeededElementIndex].getAttribute('role') != null) {
                    const $article = document.getElementsByTagName('article')[predictNeededElementIndex]

                    let mediaEl
                    let videoLink
                    if (isElementInViewport($article)) {
                        /*
                         Single video
                         */
                        let singleVideo = $article.querySelector('div > div > div > div > video')
                        if (singleVideo != null) {
                            mediaEl = singleVideo
                            videoLink = singleVideo.src
                        }
                    }

                    // Next
                    /*
                     Series video
                     */
                    let _currentSelectedControlIndex = null
                    if ($article != null) {
                        let multiVideo = [...$article.querySelectorAll('div > div > div > div > div > div > div > ul:first-child > li')].filter(el => (el.firstChild != null && el.classList.length > 0))
                        if (multiVideo != null && multiVideo.length > 0) {
                            mediaEl = null
                            videoLink = null

                            let _isLastMedia = false
                            let controlsArray = [...$article.children[2].querySelector('div > div').children[1].children]
                            // detect some things
                            for (let _i = 0; _i < controlsArray.length; _i++) {

                                if (controlsArray[_i].classList.length > 1) {
                                    _currentSelectedControlIndex = _i
                                }

                                // Is last media
                                if (_currentSelectedControlIndex == controlsArray.length - 1) {
                                    _isLastMedia = true
                                    break
                                }
                            }

                            for (let i = 0; i < multiVideo.length; i++) {

                                // First
                                if (multiVideo.length == 2) {
                                    if (_isLastMedia) {
                                        mediaEl = multiVideo[1]
                                    } else {
                                        mediaEl = multiVideo[0]
                                    }
                                } else if (multiVideo.length == 3) {
                                    if (_isLastMedia) {
                                        mediaEl = multiVideo[2]
                                    } else {
                                        mediaEl = multiVideo[1]
                                    }
                                } else if (multiVideo.length == 4) {
                                    if (_isLastMedia) {
                                        mediaEl = multiVideo[2]
                                    } else {
                                        if (controlsArray.length > 6 && _currentSelectedControlIndex == 4) {
                                            mediaEl = multiVideo[1]
                                        } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 5) {
                                            mediaEl = multiVideo[2]
                                        } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 6) {
                                            mediaEl = multiVideo[2]
                                        } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 7) {
                                            mediaEl = multiVideo[1]
                                        } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 8) {
                                            mediaEl = multiVideo[2]
                                        } else {
                                            mediaEl = multiVideo[_currentSelectedControlIndex - 1]
                                        }
                                    }
                                }

                                if (mediaEl != null && mediaEl.querySelector('video') != null) {
                                    videoLink = mediaEl.querySelector('video').src
                                    break
                                }
                            }
                        }
                    }

                    if (videoLink) {
                        if (videoLink.indexOf('blob:') !== -1) {
                            picoModal({
                                width: 400,
                                content: "<div style='padding:20px'><h4 style='font-weight:bold;margin-top:0'>[instantgram]<span style='float:right;'>v" + program.VERSION + "</span></h4><br/>" +
                                    "<p style='margin:0;text-align:center'>" + getPreLoader() + "</p>" +
                                    "<br/>" +
                                    "<h4 style='font-weight:bold;text-align:center'>" + localize('modules.modal@isLoading') + "<span id='loading_dot' style='position:fixed;'></span></h4>" +
                                    "</div>",
                                closeButton: false,
                                overlayClose: false
                            }).afterCreate(modal => {
                                getLoadingDots(modal.modalElem().querySelector('#loading_dot'))
                            }).afterShow(modal => {
                                setTimeout(function() {
                                    getBlobVideoUrl(mediaEl, function(scrapedBlobVideoUrl) {
                                        modal.close()

                                        if (scrapedBlobVideoUrl) {
                                            found = true
                                            program.foundVideo = true
                                            program.foundByModule = 'searchVideoInModalPost'

                                            window.open(scrapedBlobVideoUrl)

                                            callback(found, program)
                                        } else {
                                            found = false
                                            program.foundVideo = false
                                            program.foundByModule = 'searchVideoInModalPost'

                                            callback(found, program)
                                        }
                                    })
                                }, 500)
                            }).afterClose((modal, evt) => {
                                modal.destroy()
                            }).show()

                            break searchVideo // eslint-disable-line no-labels
                        } else {
                            found = true
                            program.foundVideo = true
                            program.foundByModule = 'searchVideoInModalPost'

                            window.open(videoLink)

                            callback(found, program)
                        }
                    } else {
                        found = false
                        program.foundVideo = false

                        callback(found, program)
                    }

                    // if found the video stop searching
                    break searchVideo // eslint-disable-line no-labels
                } else {
                    found = false
                    program.foundVideo = false

                    callback(found, program)
                }
            }
        }
        catch (e) {
            console.error('searchVideoInModalPost()', `[instantgram] ${program.VERSION}`, e)
        }
        /* =====  End of search video in modal post  ======*/
    }
}