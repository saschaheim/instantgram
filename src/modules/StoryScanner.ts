import { Program } from "../App"
import { Module } from "./Module"
import { MediaType } from "../model/mediaType"

export class StoryScanner implements Module {
  public getName(): string {
    return "StoryScanner"
  }

  /** @suppress {uselessCode} */
  public async execute(program: Program, callback?: any): Promise<any> {
    let found = false

    /* =====================================
     =            StoryScanner             =
     ==================================== */
    try {
      // Define default variables
      let mediaEl = null
      let mediaType: MediaType = MediaType.UNDEFINED

      // Container
      let $container = document.querySelector("main")

      // Scanner begins
      $container = document.querySelector("body > div")

      let storys = $container.querySelectorAll("section > div > div > div")
      for (let i = 0; i < (<any>storys).length; i++) {
        let scaleX = Number((Math.round((storys[i].getBoundingClientRect().width / (<HTMLElement>storys[i]).offsetWidth) * 100) / 100).toFixed(2))

        if (scaleX >= 1) {
          if (storys[i].classList.length > 1) {
            let isVideo = storys[i].querySelector("video") !== null
            let isImage = storys[i].querySelector("div > div img[src]") !== null || storys[i].querySelector("div > div img[srcset]") !== null

            if (process.env.DEV) {
              console.log(["isStoryImage", isImage])
              console.log(["isStoryVideo", isVideo])
            }

            if (isVideo && isImage) {
              // Set media type
              mediaType = MediaType.Video

              mediaEl = storys[i].querySelector("video")
            } else if (isImage) {
              // Set media type
              mediaType = MediaType.Image

              // Sometimes there exists no source set so be careful
              if (storys[i].querySelectorAll("img")[0] !== null) {
                mediaEl = storys[i].querySelectorAll("img")[0]
              }
            }

            break
          }
        }
      }

      callback(found, mediaEl, mediaType, program)
    } catch (e) {
      console.error(this.getName() + "()", `[instantgram] ${program.VERSION}`, e)
      callback(false, null, program)
    }
    /* =====  End of StoryScanner ======*/
  }
}