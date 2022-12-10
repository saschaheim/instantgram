import { Program } from "../App"
import { Module } from "./Module"
import { FeedScanner } from "./FeedScanner"
import { PostScanner } from "./PostScanner"
import { StoryScanner } from "./StoryScanner"
import { Modal } from "../components/Modal"
import { MediaType } from "../model/mediaType"
import getVideoUrl from "../helpers/getVideoUrl"
import getHighestResImg from "../helpers/getHighestResImg"
import getPath from "../helpers/getPath"
import localize from "../helpers/localize"

export class MediaScanner implements Module {
  private modal: Modal = new Modal()

  public getName(): string {
    return "MediaScanner"
  }

  /** @suppress {uselessCode} */
  public async execute(program: Program, callback?: any): Promise<any> {
    let found = false

    /* =====================================
     =         MediaScanner          =
     ==================================== */
    try {
      // Define default variables
      let isModal: boolean = false

      let mediaObj = {
        mediaEl: undefined,
        mediaType: MediaType.UNDEFINED
      }
      let mediaURL: string = null

      // Handle specific modules
      if (program.regexProfilePath.test(program.path)) {
        found = false
        program.foundImage = false
        program.foundVideo = false
        program.foundByModule = undefined

        callback(found, null, program)
        return
      }

      // Detect story video/image
      if (program.regexStoriesURI.test(program.path)) {
        new StoryScanner().execute(program, function (_scannerFound: boolean, foundMediaElem: any, foundMediaType: MediaType, _scannerProgram: Program) {
          mediaObj.mediaEl = foundMediaElem
          mediaObj.mediaType = foundMediaType

          if (_scannerFound) {
            program.foundByModule = new StoryScanner().getName()
          }
        })
      }

      if (mediaObj.mediaEl == null) {
        // Detect modal post
        isModal = document.querySelectorAll('[role="dialog"]').length > 0

        if (program.regexRootPath.test(program.path)) {
          new FeedScanner().execute(program, function (_scannerFound: boolean, foundMediaElem: any, foundMediaType: MediaType, _scannerProgram: Program) {
            mediaObj.mediaEl = foundMediaElem
            mediaObj.mediaType = foundMediaType

            if (_scannerFound) {
              program.foundByModule = new FeedScanner().getName()
            }
          })
        }

        if (program.regexPostPath.test(program.path)) {
          new PostScanner().execute(program, isModal, function (_scannerFound: boolean, foundMediaElem: any, foundMediaType: MediaType, _scannerProgram: Program) {
            mediaObj.mediaEl = foundMediaElem
            mediaObj.mediaType = foundMediaType

            if (_scannerFound) {
              program.foundByModule = new PostScanner().getName()
            }
          })
        }
      }

      switch (mediaObj.mediaType) {
        case MediaType.Image:
          // Get highest image if possible          
          var helperResult = await getHighestResImg(mediaObj.mediaEl)
          if (typeof helperResult === "string") {
            mediaURL = helperResult
          }

          if (mediaURL != null && mediaURL.length > 10) {
            found = true
            program.foundImage = true
            program.foundVideo = false

            callback(found, mediaURL, program)
          } else {
            found = false
            program.foundImage = false
            program.foundVideo = false

            callback(found, null, program)
          }
          break
        case MediaType.Video:
          if (typeof (mediaObj.mediaEl as HTMLVideoElement).src === "undefined" || (mediaObj.mediaEl as HTMLVideoElement).src.length == 0) {
            mediaObj.mediaEl = mediaObj.mediaEl.querySelectorAll("source")
            mediaURL = (mediaObj.mediaEl as HTMLVideoElement)[0].src
          } else {
            mediaURL = (mediaObj.mediaEl as HTMLVideoElement).src
          }

          if (mediaURL != null && mediaURL.length > 10) {
            let that = this

            getVideoUrl(mediaObj.mediaEl, function (callbackData: any) {
              found = true
              program.foundImage = false
              program.foundVideo = true

              let videoURL
              if (typeof callbackData === 'string' || callbackData instanceof String) {
                videoURL = callbackData
              } else {
                videoURL = callbackData[0].baseUrl && callbackData[0].baseUrl.length > 80 ? callbackData[0].baseUrl : null
              }

              /* Fix error network error since mai 2021 cannot download */
              videoURL = "https://scontent.cdninstagram.com" + getPath(videoURL, "unknown")

              if (videoURL) {
                callback(found, videoURL, program)
              } else {
                that.modal.heading = [
                  `<h5>[instantgram] <span style="float:right">v${program.VERSION}</span></h5>`,
                ]
                that.modal.content = [
                  localize("index#program#blob@alert_cannotDownload"),
                ]
                that.modal.contentStyle = "text-align:center"
                that.modal.buttonList = [
                  {
                    active: true,
                    text: "Ok",
                  },
                ]
                that.modal.open()

                callback(found, null, program)
              }
            })
          } else {
            found = false
            program.foundImage = false
            program.foundVideo = false
            program.foundByModule = undefined

            callback(found, null, program)
          }
          break

        default:
          found = false
          program.foundImage = false
          program.foundVideo = false
          program.foundByModule = undefined

          callback(found, null, program)
          break
      }
    } catch (e) {
      console.error(this.getName() + "()", `[instantgram] ${program.VERSION}`, e)
      callback(false, null, program)
    }
    /* =====  End of MediaScanner ======*/
  }
}