import isElementInViewport from '../helpers/isElementInViewport.js'

export default function searchVideoInFeed(program) {
    var found = false;

    if (program.regexRootPath.test(program.path)) {

        /* =====================================
         =        Search video in feed         =
         ==================================== */
        try {
            searchVideo: { // eslint-disable-line no-labels
                if (document.querySelectorAll('main > section').length === 1) {
                    const $container = document.querySelector('main > section');
                    const $article = $container.querySelectorAll('div > div > div > article');

                    let videoLink;
                    for (var i = 0;
                            i < $article.length; i++) {
                        if (isElementInViewport($article[i])) {

                            /*
                             Single video
                             */
                            let singleVideo = $article[i].querySelector('div > div > div > div > video');
                            if (singleVideo !== null) {
                                videoLink = singleVideo.src;
                                break;
                            }

                        }
                    }

                    // Next
                    /*
                     Series video
                     */
                    if (i != null && $article[i] != null) {
                        let multiVideo = [...$article[i].querySelectorAll('div > div > div > div > div > div > div > ul:first-child > li')].filter(el => (el.firstChild != null && el.classList.length > 0));
                        if (multiVideo.length > 0) {
                            videoLink = null;

                            let _currentSelectedControlIndex;
                            let _isLastMedia = false;
                            let controlsArray = [...$article[i].children[2].querySelector('div > div').children[1].children];
                            // detect some things
                            for (let _i = 0; _i < controlsArray.length; _i++) {

                                if (controlsArray[_i].classList.length > 1) {
                                    _currentSelectedControlIndex = _i;
                                }

                                // Is last media
                                if (_currentSelectedControlIndex == controlsArray.length - 1) {
                                    _isLastMedia = true;
                                    break;
                                }
                            }

                            let _mediaEl;
                            for (let i = 0; i < multiVideo.length; i++) {

                                // First
                                if (multiVideo.length == 2) {
                                    if (_isLastMedia) {
                                        _mediaEl = multiVideo[1];
                                    } else {
                                        _mediaEl = multiVideo[0];
                                    }
                                } else if (multiVideo.length == 3) {
                                    if (_isLastMedia) {
                                        _mediaEl = multiVideo[2];
                                    } else {
                                        _mediaEl = multiVideo[1];
                                    }
                                } else if (multiVideo.length == 4) {
                                    if (_isLastMedia) {
                                        _mediaEl = multiVideo[2];
                                    } else {
                                        if (controlsArray.length > 6 && _currentSelectedControlIndex == 4) {
                                            _mediaEl = multiVideo[1];
                                        } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 5) {
                                            _mediaEl = multiVideo[2];
                                        } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 6) {
                                            _mediaEl = multiVideo[2];
                                        } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 7) {
                                            _mediaEl = multiVideo[1];
                                        } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 8) {
                                            _mediaEl = multiVideo[2];
                                        } else {
                                            _mediaEl = multiVideo[_currentSelectedControlIndex - 1];
                                        }
                                    }
                                }

                                if (_mediaEl.querySelector('video').length !== null) {
                                    videoLink = _mediaEl.querySelector('video').src;
                                    break;
                                }
                            }
                        }
                    }

                    if (videoLink) {
                        if (videoLink.indexOf('blob:') !== -1) {
                            program.context = {
                                hasMsg: true,
                                msg: 'index#program@alert_videoBlob'
                            }
                            break searchVideo; // eslint-disable-line no-labels
                        } else {
                            window.open(videoLink);
                            found = true;
                            program.foundVideo = true;
                            program.foundByModule = 'searchVideoInFeed';
                            program.alertNotInInstagramPost = true; // if don't find nothing, alert to open the post
                        }
                    }

                    // if found the video stop searching
                    break searchVideo; // eslint-disable-line no-labels

                }
            }
        } catch (e) {
            console.error('searchVideoInFeed()', `[instantgram] ${program.VERSION}`, e);
        }
        /* =====  End of search video in feed  ======*/

    }

    return found;
}