import isElementInViewport from '../helpers/isElementInViewport.js'

export default function searchImageInPost(program) {
    var found = false;

    if (program.regexPostPath.test(program.path)) {

        /* =====================================
         =        Search image in post         =
         ==================================== */
        try {
            searchImage: { // eslint-disable-line no-labels
                if (document.querySelectorAll('main').length === 1) {
                    const $container = document.querySelector('main');
                    const $article = $container.querySelectorAll('div > div > article');

                    let imageLink;
                    for (var i = 0;
                            i < $article.length; i++) {
                        if (isElementInViewport($article[i])) {

                            /*
                             Single image
                             */
                            let singleImage = $article[i].querySelector('div > div > div > div > img');
                            if (singleImage !== null) {
                                imageLink = singleImage.src;
                                break;
                            }

                        }
                    }

                    // Next
                    /*
                     Series image
                     */
                    let multiImage = [...$article[i].querySelectorAll('div > div > div > div > div > div > div > ul:first-child > li')].filter(el => (el.firstChild != null && el.classList.length > 0));
                    if (multiImage.length > 0) {
                        imageLink = null;

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
                        for (let i = 0; i < multiImage.length; i++) {

                            // First
                            if (multiImage.length == 2) {
                                if (_isLastMedia) {
                                    _mediaEl = multiImage[1];
                                } else {
                                    _mediaEl = multiImage[0];
                                }
                            } else if (multiImage.length == 3) {
                                if (_isLastMedia) {
                                    _mediaEl = multiImage[2];
                                } else {
                                    _mediaEl = multiImage[1];
                                }
                            } else if (multiImage.length == 4) {
                                if (_isLastMedia) {
                                    _mediaEl = multiImage[2];
                                } else {
                                    if (controlsArray.length > 6 && _currentSelectedControlIndex == 4) {
                                        _mediaEl = multiImage[1];
                                    } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 5) {
                                        _mediaEl = multiImage[2];
                                    } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 6) {
                                        _mediaEl = multiImage[2];
                                    } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 7) {
                                        _mediaEl = multiImage[1];
                                    } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 8) {
                                        _mediaEl = multiImage[2];
                                    } else {
                                        _mediaEl = multiImage[_currentSelectedControlIndex - 1];
                                    }
                                }
                            }

                            if (_mediaEl.querySelector('img[srcset]').length !== null) {
                                imageLink = _mediaEl.querySelector('img[srcset]').src;
                                break;
                            }
                        }

                    }

                    // bring the original image if had
                    program.setImageLink(imageLink);

                    if (program.imageLink) {
                        window.open(program.imageLink);
                        found = true;
                        program.foundByModule = 'searchImageInPost';
                    } else {
                        program.context = {
                            hasMsg: true,
                            msg: 'index#program#post@alert_dontFound'
                        }
                    }

                    // if found the image stop searching
                    break searchImage; // eslint-disable-line no-labels

                }
            }
        } catch (e) {
            console.error('searchImageInPost()', `[instantgram] ${program.VERSION}`, e);
        }
        /* =====  End of search image in post ======*/

    }

    return found;
}