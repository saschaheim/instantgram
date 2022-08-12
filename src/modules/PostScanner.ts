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
            let mediaURL: string = null

            let selectedCarouselIndex: number
            let isLastMedia: boolean = false

            // Container
            let $container = document.querySelector("main")

            // Articles
            let $article: Element | NodeListOf<Element>

            // Media selector
            let mediaSelector: string = "._aagv"

            let carouselLeftButtonSelector: string = "._aahh"
            let carouselRightButtonSelector: string = "._aahi"

            // Scanner begins
            if (isModal) {
                $article = document.querySelectorAll('[role="dialog"]')[1]

                isCarousel = $article.querySelectorAll(carouselLeftButtonSelector).length !== 0 || $article.querySelectorAll(carouselRightButtonSelector).length !== 0
            } else {
                $container = document.querySelector("section main > div > :first-child")
                $article = $container.querySelector("article")

                isCarousel = $article.querySelectorAll(carouselLeftButtonSelector).length !== 0 || $article.querySelectorAll(carouselRightButtonSelector).length !== 0
            }

            console.log(["$article", $article])

            /* Series images in a modal */
            if (isCarousel) {
                let multiMedia: any = Array.from(
                    ($article as any).querySelectorAll(
                        "div > :first-child > :first-child > :first-child > ul li"
                    )
                ).filter((el: any) => el.firstChild != null && el.classList.length > 0)

                if (multiMedia != null && multiMedia.length > 0) {
                    mediaEl = null
                    mediaURL = null

                    if (process.env.DEV) {
                        console.log(["multiMedia", multiMedia])
                        console.log(["multiMedia.length", multiMedia.length])
                    }

                    let carouselControlsArray: any = ($article as HTMLElement).querySelectorAll("article > :first-child > :first-child > :first-child > div:nth-child(2) > div")

                    // Detect current image index of carousel
                    for (let i = 0; i < carouselControlsArray.length; i++) {
                        if (carouselControlsArray[i].classList.length >= 2) {
                            selectedCarouselIndex = i
                        }

                        // Is last media
                        if (selectedCarouselIndex == carouselControlsArray.length - 1) {
                            isLastMedia = true
                            break
                        }
                    }

                    selectedCarouselIndex++

                    if (process.env.DEV) {
                        console.log(["carouselControlsArray", carouselControlsArray])
                        console.log(["carouselControlsArray.length", carouselControlsArray.length])
                        console.log(["selectedCarouselIndex", selectedCarouselIndex])
                        console.log(["isLastMedia", isLastMedia])
                    }

                    for (let i = 0; i < multiMedia.length; i++) {
                        if (multiMedia.length == 2) {
                            if (isLastMedia) {
                                mediaEl = multiMedia[1]
                            } else {
                                mediaEl = multiMedia[0]
                            }
                        } else if (multiMedia.length == 3) {
                            if (isLastMedia) {
                                mediaEl = multiMedia[2]
                            } else {
                                mediaEl = multiMedia[1]
                                console.log('ff')
                                console.log(mediaEl);

                            }
                        } else if (multiMedia.length == 4) {
                            if (isLastMedia) {
                                mediaEl = multiMedia[2]
                            } else {
                                // Dont mess with me Instagram!!!
                                if (isModal && Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0) < 445) {
                                    switch (carouselControlsArray.length) {
                                        case 4:
                                            if (selectedCarouselIndex == 3) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 2) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            }
                                            break
                                        case 5:
                                            if (selectedCarouselIndex == 4) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 3) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            }
                                            break
                                        case 6:
                                            if (selectedCarouselIndex == 4) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 3) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else if (selectedCarouselIndex == 2) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            }
                                            break
                                        case 7:
                                            if (selectedCarouselIndex == 5) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 4) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 3) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            }
                                            break
                                        case 8:
                                            if (selectedCarouselIndex == 7) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 6) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 5) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else if (selectedCarouselIndex == 4) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else if (selectedCarouselIndex == 3) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            }
                                            break
                                        case 10:
                                            if (selectedCarouselIndex == 9) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 8) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else if (selectedCarouselIndex == 5) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 4) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 3) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            }
                                            break
                                    }
                                } else {
                                    switch (carouselControlsArray.length) {
                                        case 4:
                                            if (selectedCarouselIndex == 3) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 2) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            }
                                            break
                                        case 5:
                                            if (selectedCarouselIndex == 4) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 3) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            }
                                            break
                                        case 6:
                                            if (selectedCarouselIndex == 4) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else if (selectedCarouselIndex == 3) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 2) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            }
                                            break
                                        case 7:
                                            if (selectedCarouselIndex == 5) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 4) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else if (selectedCarouselIndex == 3) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            }
                                            break
                                        case 8:
                                            if (selectedCarouselIndex == 6) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else if (selectedCarouselIndex == 5) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 4) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else if (selectedCarouselIndex == 3) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            }
                                            break
                                        case 10:
                                            if (selectedCarouselIndex == 8) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 5) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else if (selectedCarouselIndex == 4) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
                                            } else if (selectedCarouselIndex == 3) {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2)]
                                            } else {
                                                mediaEl = multiMedia[Math.ceil(multiMedia.length / 2) - 1]
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

            callback(found, mediaEl, mediaType, program)
        } catch (e) {
            console.error(this.getName() + "()", `[instantgram] ${program.VERSION}`, e)
            callback(false, null, program)
        }
        /* =====  End of PostScanner ======*/
    }
}