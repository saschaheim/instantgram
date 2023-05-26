import { Program } from "../App"
import { Module } from "./Module"
import { MediaType } from "../model/mediaType"
import { htmlSpinnerMarkup } from "../components/Interconnect"
import { Modal } from "../components/Modal"
import localize from "../helpers/localize"

export class PostReelScanner implements Module {
  private selectedSidecarIndex: number

  public getName(): string {
    return "PostReelScanner"
  }

  public getPostId(): string {
    const url = window.location.href
    let regex = /\/p\/([a-zA-Z0-9_-]+)/
    let postId = url.match(regex)?.[1]

    // Fallback, is it a reel?
    if (typeof postId === 'undefined') {
      regex = /\/reel\/([a-zA-Z0-9_-]+)/
      postId = url.match(regex)?.[1]
    }

    return postId
  }

  public getUserName($reactPostNode: { return: { return: { return: { memoizedProps: { post: any } } } } }): string {
    const post = $reactPostNode?.return?.return?.return?.memoizedProps.post

    return post?.owner?.username ?? false
  }

  public unixTimestampToDate(unixTimestamp: number): string {
    const date = new Date(unixTimestamp * 1000)
    const isoDate = date.toISOString().slice(0, 10)
    const time = date.toISOString().slice(11, 16).replace(':', '-')
    return `${isoDate}--${time}`
  }

  public modalCallback = (_modal: Modal, el: HTMLElement) => {
    if (!el.querySelector('.instantgram-slider')) {
      return
    }
    // Remove previous executed bookmarklet stuff
    const dataScripts = document.querySelectorAll('#carouselSliderExec')
    // loop through each element and remove any inline style attributes or class names
    dataScripts.forEach((dEl) => {
      dEl.remove()
    })

    // Create new needed stuff
    const carouselSliderExec = document.createElement("script")
    carouselSliderExec.id = "carouselSliderExec"
    // Set the innerHTML property to the JavaScript code
    carouselSliderExec.innerHTML = `
    var slider = tns({
      container: '.instantgram-slider',
      items: 1,
      startIndex: '${this.selectedSidecarIndex}',
      navPosition: 'bottom',
      controls: false,
      mouseDrag: true,
      slideBy: 'page',
      autoplay: false
    });
    if (typeof tnsButtons === 'undefined') {
      // get all buttons with class "tns-nav"
      const tnsButtons = document.querySelectorAll(".tns-nav button");
      // add a click event listener to each button
      tnsButtons.forEach(function(button, index) {
        button.innerText = index + 1;
      });
    }`
    // Append the script element to the document
    document.body.appendChild(carouselSliderExec)
  }

  /** @suppress {uselessCode} */
  public async execute(program: Program, callback?: any): Promise<any> {
    let found = false

    /* =====================================
     =              PostScanner            =
     ==================================== */
    try {
      // Define default variables
      let mediaEl = null
      let mediaType: MediaType = MediaType.UNDEFINED

      // All grabed feed posts
      let $articles: Element | HTMLCollectionOf<HTMLElement>

      // Article
      let $article: any

      let mediaUrl: string

      // Scanner begins
      // The order is very important
      const postId = this.getPostId()

      if (mediaEl == null) {
        $articles = document.getElementsByTagName("article")

        // For modal
        // Will be in the future completly removed
        if (document.querySelectorAll('[role="dialog"]').length > 0) {
          console.log('MODAL');

          $article = document.querySelectorAll('[role="dialog"]')[1]
        } else {
          console.log('NO MODAL');
          $article = document.querySelector("section main > div > :first-child > :first-child")
        }
      }

      if (typeof $article !== 'undefined' || $article !== null || $article !== '') {
        const $reactPostEl = [...Array.from(document.querySelectorAll('*'))].filter((element) => {
          const instanceKey = Object.keys(element).find((key) => key.includes('Instance') || key.includes('Fiber'))
          const $react = element[instanceKey]
          return $react?.return?.return?.return?.memoizedProps.post ?? false
        })[0]
        const $reactInstanceKey = Object.keys($reactPostEl).find(key => key.includes('Instance') || key.includes('Fiber'))
        const $reactPostNode = $reactPostEl[$reactInstanceKey]

        const userName = this.getUserName($reactPostNode)

        // Check requirements are met
        if (postId == null || userName == null) {
          return
        }
        // END

        let modal: Modal
        modal = new Modal({
          heading: [
            `<h5>
                  <span class="header-text-left">[instantgram]</span>
                  <span class="header-text-middle">@${userName}</span>
                  <span class="header-text-right">v${program.VERSION}</span>
              </h5>
            `
          ],
          body: [htmlSpinnerMarkup],
          bodyStyle: 'padding:0!important;text-align:center',
          buttonList: [{
            active: true,
            text: localize('index#program#profilePageDownload@is_private_modal_btn')
          }],
          callback: null
        })
        modal.open()

        let modalBody = ""

        // DON'T MESS WITH ME INSTA!
        if ($reactPostNode?.return?.return?.return?.memoizedProps?.post?.isSidecar || ($reactPostNode?.return?.return?.return?.memoizedProps?.post?.sidecarChildren && $reactPostNode?.return?.return?.return?.memoizedProps?.post?.sidecarChildren.length > 0)) {
          found = true
          mediaType = MediaType.Carousel

          // Sometimes instagram pre-selects image position on carousels
          // to not confuse the user find the selected index
          const controlElements = $article.querySelectorAll('div._aamj._acvz._acnc._acng div')
          controlElements.forEach((div: { classList: string | any[] }, i: number) => {
            if (div.classList.length === 2) {
              this.selectedSidecarIndex = i
              return
            }
          })

          modalBody += `<div class="instantgram-slider">`

          for (let sC = 0; sC < $reactPostNode?.return?.return?.return?.memoizedProps?.post?.sidecarChildren.length; sC++) {
            const node = $reactPostNode?.return?.return?.return?.memoizedProps?.post
            const scMedia = $reactPostNode?.return?.return?.return?.memoizedProps?.post?.sidecarChildren[sC]

            if (typeof scMedia.dashInfo.video_dash_manifest !== 'undefined' && scMedia.dashInfo.video_dash_manifest !== null) {
              let aspectRatio = scMedia.dimensions.width / scMedia.dimensions.height
              modalBody += `<div><video style="background:black;" height="450" poster="${scMedia.src}" src="${scMedia.videoUrl}" controls></video>`
              // Add download button
              modalBody += `<button onclick="downloadFromHref('${scMedia.videoUrl}', '${userName + '_' + this.unixTimestampToDate(node.postedAt) + '_' + Number(sC + 1)}.mp4')" style="font-size:20px;font-weight:600;margin-top:-4px;" class="instantgram-modal-db">Download</button>`

              modalBody += `</div>`
            } else {
              modalBody += `<div><img height="450" src="${scMedia.src}" />`
              // Add download button
              modalBody += `<button onclick="downloadFromHref('${scMedia.src}', '${userName + '_' + this.unixTimestampToDate(node.postedAt) + '_' + Number(sC + 1)}.jpg')" style="font-size:20px;font-weight:600;margin-top:-4px;" class="instantgram-modal-db">Download</button>`

              modalBody += `</div>`
            }
          }

          mediaUrl = $reactPostNode?.return?.return?.return?.memoizedProps?.post?.sidecarChildren[this.selectedSidecarIndex]

          modalBody += `</div>`
          modal.callback = this.modalCallback
        } else {
          // Single image/video
          const media = $reactPostNode?.return?.return?.return?.memoizedProps?.post

          if (typeof media.dashInfo.video_dash_manifest !== 'undefined' && media.dashInfo.video_dash_manifest !== null) {
            found = true
            mediaType = MediaType.Video

            modalBody += `<video style="background:black;" width="500" height="450" poster="${media.src}" src="${media.videoUrl}" controls></video>`
            // Add download button
            modalBody += `<button onclick="downloadFromHref('${media.videoUrl}', '${userName + '_' + this.unixTimestampToDate(media.postedAt)}.mp4')" style="font-size:20px;font-weight:600;margin-top:-4px;" class="instantgram-modal-db">Download</button>`

            mediaUrl = media.videoUrl
          } else {
            found = true
            mediaType = MediaType.Image

            modalBody += `<img width="500" height="450" src="${media.src}" />`
            // Add download button
            modalBody += `<button onclick="downloadFromHref('${media.src}', '${userName + '_' + this.unixTimestampToDate(media.postedAt)}.jpg')" style="font-size:20px;font-weight:600;margin-top:-4px;" class="instantgram-modal-db">Download</button>`

            mediaUrl = media.src
          }

          modal.callback = null
        }

        modal.body = [modalBody]
        modal.refresh()
      }

      callback(found, mediaType, mediaUrl, program)
    } catch (e) {
      console.error(this.getName() + "()", `[instantgram] ${program.VERSION}`, e)
      callback(false, null, program)
    }
    /* =====  End of PostScanner ======*/
  }
}