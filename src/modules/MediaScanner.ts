import { Program } from "../App"
import { Module } from "./Module"
import { cssCarouselSlider, cssGeneral, jsCarouselSlider } from "../components/Interconnect"
import { MediaType } from "../model/mediaType"
import { FeedScanner } from "./FeedScanner"
import { PostReelScanner } from "./PostReelScanner"
import { ReelsScanner } from "./ReelsScanner"
import { StoriesScanner } from "./StoriesScanner"

export class MediaScanner implements Module {
  public getName(): string {
    return "MediaScanner"
  }

  /** @suppress {uselessCode} */
  public async execute(program: Program, callback?: any): Promise<any> {
    let found = false

    /* =====================================
     =         MediaScanner                =
     ==================================== */
    try {
      // Define default variables
      let mediaObj = {
        mediaType: MediaType.UNDEFINED,
        mediaEl: undefined,
        mediaURL: undefined,
      }

      // Scanner begins
      // Cancel execution when modal already opened
      const instantgramRunning = document.querySelector('div.instantgram-modal-overlay.instantgram-modal-visible.instantgram-modal-show')
      if (instantgramRunning) {
        let iModal: any = document.querySelector('.instantgram-modal')
        iModal.style.animation = 'horizontal-shaking 0.25s linear infinite'

        // Stop shaking
        setTimeout(function () {
          iModal.style.animation = null
        }, 1000)
        return
      }
      // Remove previous executed bookmarklet stuff
      const dataScripts = document.querySelectorAll('#cssGeneral, #cssCarouselSlider, #jsCarouselSlider, #jsDataDownload')
      // loop through each element and remove any inline style attributes or class names
      dataScripts.forEach((el) => {
        el.remove()
      })

      // Create new needed stuff
      const generalStyle = document.createElement("style")
      generalStyle.id = "cssGeneral"
      // Set the innerHTML property to the JavaScript code
      generalStyle.innerHTML = cssGeneral
      // Append the script element to the document
      document.body.appendChild(generalStyle)

      const carouselSliderStyle = document.createElement("style")
      carouselSliderStyle.id = "cssCarouselSlider"
      // Set the innerHTML property to the JavaScript code
      carouselSliderStyle.innerHTML = cssCarouselSlider
      // Append the script element to the document
      document.body.appendChild(carouselSliderStyle)

      const carouselSliderScript = document.createElement("script")
      carouselSliderScript.id = "jsCarouselSlider"
      // Set the innerHTML property to the JavaScript code
      carouselSliderScript.innerHTML = jsCarouselSlider
      // Append the script element to the document
      document.body.appendChild(carouselSliderScript)

      const dataDownloadScript = document.createElement("script")
      dataDownloadScript.id = "jsDataDownload"
      // Set the innerHTML property to the JavaScript code
      dataDownloadScript.innerHTML = `async function toDataURL(url) {
          const blob = await fetch(url).then(res => res.blob());
          return URL.createObjectURL(blob);
      }
      async function downloadFromHref(url, filename) {
          const a = document.createElement("a");
          a.href = await toDataURL(url);
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
      }`
      // Append the script element to the document
      document.body.appendChild(dataDownloadScript)

      // Handle specific modules
      // Detect profile root path
      if (program.regexProfilePath.test(program.path)) {
        found = false
        program.foundByModule = undefined

        callback(found, null, program)
        return
      }

      // Detect story video/image
      if (program.regexStoriesURI.test(program.path)) {
        new StoriesScanner().execute(program, function (_scannerFound: boolean, foundMediaType: MediaType, foundMediaUrl: string, _scannerProgram: Program) {
          mediaObj.mediaType = foundMediaType
          mediaObj.mediaURL = foundMediaUrl

          if (_scannerFound) {
            found = true
            program.foundByModule = new StoriesScanner().getName()
          }
        })
      }

      if (mediaObj.mediaEl == null) {
        if (program.regexRootPath.test(program.path)) {
          new FeedScanner().execute(program, function (_scannerFound: boolean, foundMediaType: MediaType, foundMediaUrl: string, _scannerProgram: Program) {
            mediaObj.mediaType = foundMediaType
            mediaObj.mediaURL = foundMediaUrl

            if (_scannerFound) {
              found = true
              program.foundByModule = new FeedScanner().getName()
            }
          })
        }

        if (program.regexReelsURI.test(program.path)) {
          new ReelsScanner().execute(program, function (_scannerFound: boolean, foundMediaType: MediaType, foundMediaUrl: string, _scannerProgram: Program) {
            mediaObj.mediaType = foundMediaType
            mediaObj.mediaURL = foundMediaUrl

            if (_scannerFound) {
              found = true
              program.foundByModule = new ReelsScanner().getName()
            }
          })
        }

        if (program.regexPostPath.test(program.path) || program.regexReelURI.test(program.path)) {
          new PostReelScanner().execute(program, function (_scannerFound: boolean, foundMediaType: MediaType, foundMediaUrl: string, _scannerProgram: Program) {
            mediaObj.mediaType = foundMediaType
            mediaObj.mediaURL = foundMediaUrl

            if (_scannerFound) {
              found = true
              program.foundByModule = new PostReelScanner().getName()
            }
          })
        }
      }

      callback(found, mediaObj.mediaType, mediaObj.mediaURL, program)
    } catch (e) {
      console.error(this.getName() + "()", `[instantgram] ${program.VERSION}`, e)
      callback(false, null, program)
    }
    /* =====  End of MediaScanner ======*/
  }
}