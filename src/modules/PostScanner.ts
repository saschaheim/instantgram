import { Program } from "../App"
import { Module } from "./Module"
import { MediaType } from "../model/mediaType"

export class PostScanner implements Module {
    public getName(): string {
        return "PostScanner"
    }

    /** @suppress {uselessCode} */
    public async execute(program: Program, _isModal: boolean, callback?: any): Promise<any> {
        let found = false

        /* =====================================
         =              PostScanner            =
         ==================================== */
        try {
            // Define default variables
            let isModal: boolean = _isModal
            let isCarousel: boolean = false

            let mediaEl = null
            let mediaType: MediaType = MediaType.UNDEFINED

            let selectedCarouselMediaSlideIndex: number
            let isLastMedia: boolean = false

            // Container
            let $container = document.querySelector("main")

            // Articles
            let $article: Element | NodeListOf<Element>

            // Media selector
            let mediaSelector: string = "._aagv"

            let carouselLeftButtonSelector: string = "._9zm0"
            let carouselRightButtonSelector: string = "._9zm2"

            // Scanner begins
            if (isModal) {
                $article = document.querySelectorAll('[role="dialog"]')[1]

                isCarousel = $article.querySelectorAll(carouselLeftButtonSelector).length !== 0 || $article.querySelectorAll(carouselRightButtonSelector).length !== 0
            } else {
                $container = document.querySelector("section main > div > :first-child")
                $article = $container.querySelector("article")

                isCarousel = $article.querySelectorAll(carouselLeftButtonSelector).length !== 0 || $article.querySelectorAll(carouselRightButtonSelector).length !== 0
            }

            /* Series images in a modal */
            if (isCarousel) {
                let carouselMediaSlideElements: any = Array.from(
                    ($article as any).querySelectorAll(
                        "div > :first-child > :first-child > :first-child > ul li"
                    )
                ).filter((el: any) => el.firstChild != null && el.classList.length > 0)

                if (carouselMediaSlideElements != null && carouselMediaSlideElements.length > 0) {
                    let carouselControlsArray: any = Array.from(
                        ($article as HTMLElement).querySelectorAll(
                            "article > :first-child > :first-child > :first-child > div:nth-child(2) > div"
                        )
                    ).filter((el: any) => el.classList.length <= 2)

                    // Detect current image index of carousel
                    for (let i = 0; i < carouselControlsArray.length; i++) {
                        if (carouselControlsArray[i].classList.length == 2) {
                            selectedCarouselMediaSlideIndex = i
                        }

                        // Is last media
                        if (selectedCarouselMediaSlideIndex == carouselControlsArray.length - 1) {
                            isLastMedia = true
                            break
                        }
                    }

                    selectedCarouselMediaSlideIndex++

                    if (process.env.DEV) {
                        console.log(["isCarousel", isCarousel])
                        console.log(["carouselControlsArray", carouselControlsArray])
                        console.log(["carouselControlsArray.length", carouselControlsArray.length])
                        console.log(["selectedCarouselMediaSlideIndex", selectedCarouselMediaSlideIndex])
                        console.log(["isLastMedia", isLastMedia])
                    }

                    let M = carouselMediaSlideElements
                    let S = selectedCarouselMediaSlideIndex
                    for (let i = 0; i < M.length; i++) {
                        if (M.length == 2) {
                            if (isLastMedia) {
                                mediaEl = M[1]
                            } else {
                                mediaEl = M[0]
                            }
                        } else if (M.length == 3) {
                            if (isLastMedia) {
                                mediaEl = M[2]
                            } else {
                                mediaEl = M[1]
                            }
                        } else if (M.length == 4) {
                            if (isLastMedia) {
                                mediaEl = M[2]
                            } else {
                                // Dont mess with me Instagram!!!                                
                                if (isModal && Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) < 445) {
                                    switch (carouselControlsArray.length) {
                                        case 4:
                                            if (S == 3) {
                                                mediaEl = M[Math.ceil(M.length / 2)]
                                            } else if (S == 2) {
                                                mediaEl = M[Math.ceil(M.length / 2) - 1]
                                            } else {
                                                mediaEl = M[Math.ceil(M.length / 2) - 1]
                                            }
                                            break
                                        case 5:
                                            if (program.browser.name == "firefox") {
                                                if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            } else {

                                                if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            }
                                            break
                                        case 6:
                                            if (S == 4) {
                                                mediaEl = M[Math.ceil(M.length / 2)]
                                            } else if (S == 3) {
                                                mediaEl = M[Math.ceil(M.length / 2) - 1]
                                            } else if (S == 2) {
                                                mediaEl = M[Math.ceil(M.length / 2) - 1]
                                            } else {
                                                mediaEl = M[Math.ceil(M.length / 2)]
                                            }
                                            break
                                        case 7:
                                            if (program.browser.name == "firefox") {
                                                if (S == 6) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            } else {
                                                if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            }
                                            break
                                        case 8:
                                            if (program.browser.name == "firefox") {
                                                if (S == 6) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            } else {
                                                if (S == 7) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 6) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            }
                                            break
                                        case 10:
                                            if (program.browser.name == "firefox") {
                                                if (S == 9) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 8) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 7) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 6) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            } else {
                                                if (S == 9) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 8) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            }
                                            break
                                    }
                                } else {
                                    switch (carouselControlsArray.length) {
                                        case 4:
                                            if (S == 3) {
                                                mediaEl = M[Math.ceil(M.length / 2)]
                                            } else if (S == 2) {
                                                mediaEl = M[Math.ceil(M.length / 2) - 1]
                                            } else {
                                                mediaEl = M[Math.ceil(M.length / 2) - 1]
                                            }
                                            break
                                        case 5:
                                            if (program.browser.name == "firefox") {
                                                if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            } else {
                                                if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            }
                                            break
                                        case 6:
                                            if (program.browser.name == "firefox") {
                                                if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 2) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                }
                                            } else {
                                                if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 2) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                }
                                            }
                                            break
                                        case 7:
                                            if (program.browser.name == "firefox") {
                                                if (S == 6) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            } else {
                                                if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            }
                                            break
                                        case 8:
                                            if (program.browser.name == "firefox") {
                                                if (S == 7) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 6) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            } else {
                                                if (S == 6) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            }
                                            break
                                        case 9:
                                            if (program.browser.name == "firefox") {
                                                if (S == 9) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 8) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 7) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 6) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            } else {
                                                if (S == 8) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 7) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            }
                                            break
                                        case 10:
                                            if (program.browser.name == "firefox") {
                                                if (S == 9) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 8) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 7) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 6) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            } else {
                                                if (S == 9) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 8) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 7) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else if (S == 5) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 4) {
                                                    mediaEl = M[Math.ceil(M.length / 2)]
                                                } else if (S == 3) {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                } else {
                                                    mediaEl = M[Math.ceil(M.length / 2) - 1]
                                                }
                                            }
                                            break
                                    }
                                }
                            }
                        }

                        // Detect media type
                        if (mediaEl != null) {
                            let isVideo = mediaEl.querySelector("video") !== null
                            let isImage = mediaEl.querySelector("img[src]") !== null || mediaEl.querySelector("img[srcset]") !== null

                            if (isVideo) {
                                // Set media type
                                mediaType = MediaType.Video

                                mediaEl = mediaEl.querySelector("video")
                                break
                            } else if (isImage) {
                                // Set media type
                                mediaType = MediaType.Image

                                // Sometimes there exists no source set so be careful
                                if (mediaEl.querySelector("img[srcset]") !== null) {
                                    mediaEl = mediaEl.querySelector("img[srcset]")
                                } else {
                                    // Use source
                                    mediaEl = mediaEl.querySelector("img[src]")
                                }
                                break
                            }
                        }
                    }
                }
            } else {
                /* Single image in a modal */
                if ($article) {
                    let isVideo = ($article as Element).querySelector("video") !== null
                    let isImage = ($article as Element).querySelector(`${mediaSelector} > img[src]`) !== null || ($article as Element).querySelector(`${mediaSelector} > img[srcset]`) !== null

                    if (isVideo) {
                        // Set media type
                        mediaType = MediaType.Video

                        mediaEl = ($article as Element).querySelector("video")
                    } else if (isImage) {
                        // Set media type
                        mediaType = MediaType.Image

                        // Sometimes there exists no sourceset so be careful
                        if (($article as Element).querySelector(`${mediaSelector} > img[srcset]`) !== null) {
                            mediaEl = ($article as Element).querySelector(`${mediaSelector} > img[srcset]`)
                        } else {
                            // Use source
                            mediaEl = ($article as Element).querySelector(`${mediaSelector} > img[src]`)
                        }
                    }
                }
            }

            if (mediaType == MediaType.Image || mediaType == MediaType.Video && mediaEl) {
                found = true
            }

            callback(found, mediaEl, mediaType, program)
        } catch (e) {
            console.error(this.getName() + "()", `[instantgram] ${program.VERSION}`, e)
            callback(false, null, program)
        }
        /* =====  End of PostScanner ======*/
    }
}