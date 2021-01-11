import getHighestResImg from '../helpers/getHighestResImg.js'
import isElementInViewport from '../helpers/isElementInViewport.js'

export default function searchImageInModalPost(program) {
    var found = false

    if (program.regexPostPath.test(program.path)) {

        /* =====================================
         =      Search image in modal post     =
         ==================================== */
        try {
            searchImage: { // eslint-disable-line no-labels
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

                if (document.getElementsByTagName('article') != null && document.getElementsByTagName('article')[predictNeededElementIndex].getAttribute('role') != null) { // when instagram post is a modal
                    const $article = document.getElementsByTagName('article')[predictNeededElementIndex]

                    let mediaEl = null
                    let imageLink = null
                    if (isElementInViewport($article)) {
                        /*
                         Single image
                         */
                        let singleImage = $article.querySelector('img[srcset]')
                        if (singleImage != null) {
                            mediaEl = singleImage
                            // Get highest image if possible
                            if (getHighestResImg(singleImage).length > 0) {
                                imageLink = getHighestResImg(singleImage)
                            }
                        }
                    }

                    // Next
                    /*
                     Series image
                     */
                    if ($article != null) {
                        let multiImage = [...$article.querySelectorAll('div > div > div > div > div > div > div > ul:first-child > li')].filter(el => (el.firstChild != null && el.classList.length > 0))
                        if (multiImage != null && multiImage.length > 0) {
                            mediaEl = null
                            imageLink = null

                            let _currentSelectedControlIndex
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

                            for (let i = 0; i < multiImage.length; i++) {

                                // First
                                if (multiImage.length == 2) {
                                    if (_isLastMedia) {
                                        mediaEl = multiImage[1]
                                    } else {
                                        mediaEl = multiImage[0]
                                    }
                                } else if (multiImage.length == 3) {
                                    if (_isLastMedia) {
                                        mediaEl = multiImage[2]
                                    } else {
                                        mediaEl = multiImage[1]
                                    }
                                } else if (multiImage.length == 4) {
                                    if (_isLastMedia) {
                                        mediaEl = multiImage[2]
                                    } else {
                                        if (controlsArray.length > 6 && _currentSelectedControlIndex == 4) {
                                            mediaEl = multiImage[1]
                                        } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 5) {
                                            mediaEl = multiImage[2]
                                        } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 6) {
                                            mediaEl = multiImage[2]
                                        } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 7) {
                                            mediaEl = multiImage[1]
                                        } else if (controlsArray.length > 6 && _currentSelectedControlIndex == 8) {
                                            mediaEl = multiImage[2]
                                        } else {
                                            mediaEl = multiImage[_currentSelectedControlIndex - 1]
                                        }
                                    }
                                }

                                if (mediaEl != null && mediaEl.querySelector('img[srcset]') != null) {
                                    // Get highest image if possible
                                    if (getHighestResImg(mediaEl.querySelector('img[srcset]')).length > 0) {
                                        imageLink = getHighestResImg(mediaEl.querySelector('img[srcset]'))
                                    }
                                    break
                                } else {
                                    if (mediaEl.querySelector('img[src]') != null) {
                                        imageLink = mediaEl.querySelector('img[src]').src
                                    }
                                    break
                                }
                            }
                        }
                    }

                    // bring the original image if had
                    program.setImageLink(imageLink)

                    if (program.imageLink) {
                        found = true
                        program.foundImage = true
                        program.foundByModule = 'searchImageInModalPost'

                        window.open(program.imageLink)
                    } else {
                        found = false
                        program.foundImage = false
                    }

                    // if found the image stop searching
                    break searchImage // eslint-disable-line no-labels

                }
            }
        }
        catch (e) {
            console.error('searchImageInModalPost()', `[instantgram] ${program.VERSION}`, e)
        }
        /* =====  End of search in modal post ======*/

    }

    return found
}