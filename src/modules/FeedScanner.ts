import { Program } from "../App"
import { Module } from "./Module"
import { MediaType } from "../model/mediaType"
import getElementInViewPercentage from "../helpers/getElementInViewPercentage"

export class FeedScanner implements Module {
  public getName(): string {
    return "FeedScanner"
  }

  /** @suppress {uselessCode} */
  public async execute(program: Program, callback?: any): Promise<any> {
    let found = false

    /* =====================================
     =              FeedScanner            =
     ==================================== */
    try {
      // Define default variables
      let mediaEl = null
      let mediaType: MediaType = MediaType.UNDEFINED

      let mediaElInfo: any

      let selectedCarouselMediaSlideIndex: number
      let isLastMedia: boolean = false

      // Container
      let $container = document.querySelector("main")

      // Selected Article
      let $article: Element

      // Articles
      let $articles: Element | HTMLCollectionOf<HTMLElement>

      // Media selector
      let mediaSelector: string = "._aagv"

      let carouselLeftButtonSelector: string = "._aahh"
      let carouselRightButtonSelector: string = "._aahi"

      if (mediaEl == null) {
        $container = document.querySelector("main section > div:first-child > div:last-child > div:first-child > div:first-child")
        //$articles = $container.querySelectorAll("article")
        $articles = document.getElementsByTagName("article")

        let mediaElInfos: any[] = []
        for (let i1 = 0; i1 < $articles.length; i1++) {
          let isCarousel = $articles[i1].querySelector(carouselLeftButtonSelector) !== null || $articles[i1].querySelector(carouselRightButtonSelector) !== null

          //console.log([`article ${i1 + 1}`, $articles[i1]])
          //console.log([`isCarousel ${i1 + 1}`, isCarousel])

          let mediaEl: any
          if (isCarousel) {
            mediaEl = $articles[i1].querySelector(":first-child > :nth-child(2) > :first-child ul > li:nth-child(2) img[crossorigin='anonymous']")
              || $articles[i1].querySelector(":first-child > :nth-child(2) > :first-child ul > li:nth-child(2) video[crossorigin='anonymous']")
          } else {
            mediaEl = $articles[i1].querySelector(":first-child > :nth-child(2) > [role=button] img[crossorigin='anonymous']")
              || $articles[i1].querySelector(":first-child > :nth-child(2) video[crossorigin='anonymous']")
          }

          if (mediaEl != null && typeof mediaEl.getBoundingClientRect() != null) {
            let elemVisiblePercentage = getElementInViewPercentage(mediaEl)
            mediaElInfos.push({ i1, mediaEl, elemVisiblePercentage, isCarousel })
          } else {
            mediaElInfos.push({ i1, mediaEl, elemVisiblePercentage: 0, isCarousel })
          }
        }

        let objMax = mediaElInfos.reduce((max, current) => max.elemVisiblePercentage > current.elemVisiblePercentage ? max : current)
        $article = $articles[objMax.i1]

        mediaElInfo = mediaElInfos[objMax.i1]
      }

      /*
       * For carousel
       */
      if (mediaElInfo.isCarousel) {
        let carouselMediaSlideElements: any = Array.from(
          ($article as any).querySelectorAll(
            "div > :first-child > :first-child > :first-child > ul li"
          )
        ).filter((el: any) => el.firstChild != null && el.classList.length > 0)

        if (carouselMediaSlideElements != null && carouselMediaSlideElements.length > 0) {
          let carouselControlsArray: any = ($article as HTMLElement).querySelectorAll(":first-child > div:nth-child(2) > div > div:nth-child(2) > div")

          // Detect current image index of carousel
          for (let i = 0; i < carouselControlsArray.length; i++) {
            if (carouselControlsArray[i].classList.length >= 2) {
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
                    if (S == 4) {
                      mediaEl = M[Math.ceil(M.length / 2)]
                    } else if (S == 3) {
                      mediaEl = M[Math.ceil(M.length / 2)]
                    } else {
                      mediaEl = M[Math.ceil(M.length / 2) - 1]
                    }
                    break
                  case 6:
                    if (S == 4) {
                      mediaEl = M[Math.ceil(M.length / 2) - 1]
                    } else if (S == 3) {
                      mediaEl = M[Math.ceil(M.length / 2)]
                    } else if (S == 2) {
                      mediaEl = M[Math.ceil(M.length / 2) - 1]
                    } else {
                      mediaEl = M[Math.ceil(M.length / 2)]
                    }
                    break
                  case 7:
                    if (S == 5) {
                      mediaEl = M[Math.ceil(M.length / 2)]
                    } else if (S == 4) {
                      mediaEl = M[Math.ceil(M.length / 2) - 1]
                    } else if (S == 3) {
                      mediaEl = M[Math.ceil(M.length / 2)]
                    } else {
                      mediaEl = M[Math.ceil(M.length / 2) - 1]
                    }
                    break
                  case 8:
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
                    break
                  case 10:
                    if (S == 8) {
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
                    break
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
        /*
         * For single image/video
         */
      } else {
        if ($article) {
          let isVideo = $article.querySelector("video") !== null
          let isImage = $article.querySelector(`${mediaSelector} > img[src]`) !== null || $article.querySelector(`${mediaSelector} > img[srcset]`) !== null

          if (isVideo) {
            // Set media type
            mediaType = MediaType.Video

            mediaEl = $article.querySelector("video")
          } else if (isImage) {
            // Set media type
            mediaType = MediaType.Image

            // Sometimes there exists no source set so be careful
            if ($article.querySelector(`${mediaSelector} > img[srcset]`) !== null) {
              mediaEl = $article.querySelector(`${mediaSelector} > img[srcset]`)
            } else {
              // Use source
              mediaEl = $article.querySelector(`${mediaSelector} > img[src]`)
            }
          }
        }
      }

      callback(found, mediaEl, mediaType, program)
    } catch (e) {
      console.error(this.getName() + "()", `[instantgram] ${program.VERSION}`, e)
      callback(false, null, program)
    }
    /* =====  End of FeedScanner ======*/
  }
}