import { Program } from "../App"
import { Module } from "./Module"
import { MediaType } from "../model/mediaType"
import { Modal } from "../components/Modal"
import localize from "../helpers/localize"

export class StoriesScanner implements Module {
  public getName(): string {
    return "StoriesScanner"
  }

  public getUserName(element: Document): string | undefined {
    let userName: string | undefined

    const userNameContainer = element.querySelectorAll('header a')[1]
    if (userNameContainer) {
      userName = userNameContainer.textContent
    }

    return userName
  }

  public unixTimestampToDate(unixTimestamp: number): string {
    const date = new Date(unixTimestamp * 1000)
    const isoDate = date.toISOString().slice(0, 10)
    const time = date.toISOString().slice(11, 16).replace(':', '-')
    return `${isoDate}--${time}`
  }

  public pauseCurrentStory() {
    // Select the button element with SVG viewBox="0 0 48 48"
    let button = document.querySelector('button._abl- svg[viewBox="0 0 48 48"]')

    // Trigger a click event on the button if it exists
    if (button) {
      button.closest('button').click()
    }
  }

  public modalCallback = (_modal: Modal, el: HTMLElement) => {
    if (!el.querySelector('.instantgram-slider')) {
      return
    }

    // Remove previous executed bookmarklet stuff
    const dataScripts = document.querySelectorAll('#carouselSliderExec')
    // loop through each element and remove any inline style attributes or class names
    dataScripts.forEach((el) => {
      el.remove()
    })

    // Create new needed stuff
    const carouselSliderExec = document.createElement("script")
    carouselSliderExec.id = "carouselSliderExec"
    // Set the innerHTML property to the JavaScript code
    carouselSliderExec.innerHTML = `
    var slider = tns({
      container: '.instantgram-slider',
      items: 1,
      navPosition: 'bottom',
      controls: false,
      mouseDrag: true,
      slideBy: 'page',
      autoplay: false
    });
    // get all buttons with class "tns-nav"
    const buttons = document.querySelectorAll(".tns-nav button");
    // add a click event listener to each button
    buttons.forEach(function(button, index) {
      button.innerText = index + 1;
    });`
    // Append the script element to the document
    document.body.appendChild(carouselSliderExec)
  }

  /** @suppress {uselessCode} */
  public async execute(program: Program, callback?: any): Promise<any> {
    let found = false

    /* =====================================
     =            StoriesScanner           =
     ==================================== */
    try {
      // Define default variables
      let mediaType: MediaType = MediaType.UNDEFINED

      // Container
      let $container = document.querySelector("body > div:nth-child(2)")
      // Scanner begins
      if ($container) {
        const userName = this.getUserName(document)

        // Check requirements are met
        if (userName == null) {
          //return
        }
        // END

        let modal = new Modal({
          heading: [
            `<h5>
                  <span class="header-text-left">[instantgram]</span>
                  <span class="header-text-middle">@${userName}</span>
                  <span class="header-text-right">v${program.VERSION}</span>
                </h5>`
          ],
          body: [`<div style="padding:40px"><svg width="45" height="100" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"> <defs> <linearGradient id="gradient" gradientTransform="rotate(-20)"> <stop offset="0%" stop-color="#405de6"></stop> <stop offset="12%" stop-color="#5851db"></stop> <stop offset="25%" stop-color="#833ab4"></stop> <stop offset="50%" stop-color="#c13584"></stop> <stop offset="66.67%" stop-color="#e1306c"></stop> <stop offset="100%" stop-color="#fd1d1d"></stop> </linearGradient> </defs> <style> .spinner_LWk7 { animation: spinner_GWy6 1.2s linear infinite, spinner_BNNO 1.2s linear infinite } .spinner_yOMU { animation: spinner_GWy6 1.2s linear infinite, spinner_pVqn 1.2s linear infinite; animation-delay: .15s } .spinner_KS4S { animation: spinner_GWy6 1.2s linear infinite, spinner_6uKB 1.2s linear infinite; animation-delay: .3s } .spinner_zVee { animation: spinner_GWy6 1.2s linear infinite, spinner_Qw4x 1.2s linear infinite; animation-delay: .45s } @keyframes spinner_GWy6 { 0%, 50% { width: 9px; height: 9px } 10% { width: 11px; height: 11px } } @keyframes spinner_BNNO { 0%, 50% { x: 1.5px; y: 1.5px } 10% { x: .5px; y: .5px } } @keyframes spinner_pVqn { 0%, 50% { x: 13.5px; y: 1.5px } 10% { x: 12.5px; y: .5px } } @keyframes spinner_6uKB { 0%, 50% { x: 13.5px; y: 13.5px } 10% { x: 12.5px; y: 12.5px } } @keyframes spinner_Qw4x { 0%, 50% { x: 1.5px; y: 13.5px } 10% { x: .5px; y: 12.5px } } </style> <rect class="spinner_LWk7" x="1.5" y="1.5" rx="1" width="9" height="9" fill="url(#gradient)"></rect> <rect class="spinner_yOMU" x="13.5" y="1.5" rx="1" width="9" height="9" fill="url(#gradient)"></rect> <rect class="spinner_KS4S" x="13.5" y="13.5" rx="1" width="9" height="9" fill="url(#gradient)"></rect> <rect class="spinner_zVee" x="1.5" y="13.5" rx="1" width="9" height="9" fill="url(#gradient)"></rect></svg></div>`],
          bodyStyle: 'padding:0!important;text-align:center',
          buttonList: [{
            active: true,
            text: localize('index#program#profilePageDownload@is_private_modal_btn')
          }],
        })
        modal.open()
        let modalBody = ""

        // Detect right frontend
        let multipleStoriesCount = $container.querySelector("section > div > div").childElementCount

        // Specific selector for each frontend
        console.log(`multipleStoriesCount ${multipleStoriesCount}`)
        if (multipleStoriesCount > 1) {
          let stories: any = $container.querySelector("section > div > div").childNodes

          for (let i = 0; i < (<any>stories).length; i++) {
            let transformStyle = (<any>stories[i]).style.transform

            if (<any>stories[i].childElementCount > 0 && transformStyle.includes('scale(1)')) {
              console.log('>>')
              console.log(<any>stories[i])
              // Pause any playing videos before show modal
              this.pauseCurrentStory()

              const $reactPostEl = [...Array.from(stories[i].querySelectorAll('*'))].filter((element) => {
                const instanceKey = Object.keys(element).find((key) => key.includes('Instance') || key.includes('Fiber'))
                const $react = element[instanceKey]
                return $react?.return?.return?.return?.memoizedProps.post ?? false
              })[0]
              const $reactInstanceKey = Object.keys($reactPostEl).find(key => key.includes('Instance') || key.includes('Fiber'))
              const $reactPostNode = $reactPostEl[$reactInstanceKey]

              // DON'T MESS WITH ME INSTA!
              console.log($reactPostNode?.return?.return?.return?.memoizedProps?.post)
              if ($reactPostNode?.return?.return?.return?.memoizedProps?.post?.isSidecar || ($reactPostNode?.return?.return?.return?.memoizedProps?.post?.sidecarChildren && $reactPostNode?.return?.return?.return?.memoizedProps?.post?.sidecarChildren.length > 0)) {
                found = true
                mediaType = MediaType.Carousel

                modalBody += `<div class="instantgram-slider">`

                for (let sC = 0; sC < $reactPostNode?.return?.return?.return?.memoizedProps?.post?.sidecarChildren.length; sC++) {
                  const node = $reactPostNode?.return?.return?.return?.memoizedProps?.post
                  const scMedia = $reactPostNode?.return?.return?.return?.memoizedProps?.post?.sidecarChildren[sC]

                  if (typeof scMedia.dashInfo.video_dash_manifest !== 'undefined' && scMedia.dashInfo.video_dash_manifest !== null) {
                    modalBody += `<div><video style="background:black;" width="500" height="450" poster="${scMedia.src}" src="${scMedia.videoUrl}" controls></video>`
                    // Add download button
                    modalBody += `<button onclick="downloadFromHref('${scMedia.videoUrl}', '${userName + '_' + this.unixTimestampToDate(node.postedAt) + '_' + Number(sC + 1)}.mp4')" style="font-size:20px;font-weight:600;margin-top:-4px;" class="instantgram-modal-db">Download</button>`

                    modalBody += `</div>`
                  } else {
                    modalBody += `<div><img width="500" height="450" src="${scMedia.src}" />`
                    // Add download button
                    modalBody += `<button onclick="downloadFromHref('${scMedia.src}', '${userName + '_' + this.unixTimestampToDate(node.postedAt) + '_' + Number(sC + 1)}.jpg')" style="font-size:20px;font-weight:600" class="instantgram-modal-db">Download</button>`

                    modalBody += `</div>`
                  }
                }

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
                } else {
                  found = true
                  mediaType = MediaType.Image

                  modalBody += `<img width="500" height="450" src="${media.src}" />`
                  // Add download button
                  modalBody += `<button onclick="downloadFromHref('${media.src}', '${userName + '_' + this.unixTimestampToDate(media.postedAt)}.jpg')" style="font-size:20px;font-weight:600;margin-top:-4px;" class="instantgram-modal-db">Download</button>`
                }

                modal.callback = null
              }

              break
            }
          }
        } else {
          let story: any = $container.querySelector("section section").parentElement.firstChild
          // Pause any playing videos before show modal
          this.pauseCurrentStory()

          const $reactPostEl = [...Array.from(story.querySelectorAll('*'))].filter((element) => {
            const instanceKey = Object.keys(element).find((key) => key.includes('Instance') || key.includes('Fiber'))
            const $react = element[instanceKey]
            return $react?.return?.return?.return?.memoizedProps.post ?? false
          })[0]
          const $reactInstanceKey = Object.keys($reactPostEl).find(key => key.includes('Instance') || key.includes('Fiber'))
          const $reactPostNode = $reactPostEl[$reactInstanceKey]

          console.log($reactPostNode?.return?.return?.return?.memoizedProps?.post)

          if ($reactPostNode?.return?.return?.return?.memoizedProps?.post?.isSidecar || ($reactPostNode?.return?.return?.return?.memoizedProps?.post?.sidecarChildren && $reactPostNode?.return?.return?.return?.memoizedProps?.post?.sidecarChildren.length > 0)) {
            found = true
            mediaType = MediaType.Carousel

            modalBody += `<div class="instantgram-slider">`

            for (let sC = 0; sC < $reactPostNode?.return?.return?.return?.memoizedProps?.post?.sidecarChildren.length; sC++) {
              const node = $reactPostNode?.return?.return?.return?.memoizedProps?.post
              const scMedia = $reactPostNode?.return?.return?.return?.memoizedProps?.post?.sidecarChildren[sC]

              if (typeof scMedia.dashInfo.video_dash_manifest !== 'undefined' && scMedia.dashInfo.video_dash_manifest !== null) {
                modalBody += `<div><video style="background:black;" width="500" height="450" poster="${scMedia.src}" src="${scMedia.videoUrl}" controls></video>`
                // Add download button
                modalBody += `<button onclick="downloadFromHref('${scMedia.videoUrl}', '${userName + '_' + this.unixTimestampToDate(node.postedAt) + '_' + Number(sC + 1)}.mp4')" style="font-size:20px;font-weight:600;margin-top:-4px;" class="instantgram-modal-db">Download</button>`

                modalBody += `</div>`
              } else {
                modalBody += `<div><img width="500" height="450" src="${scMedia.src}" />`
                // Add download button
                modalBody += `<button onclick="downloadFromHref('${scMedia.src}', '${userName + '_' + this.unixTimestampToDate(node.postedAt) + '_' + Number(sC + 1)}.jpg')" style="font-size:20px;font-weight:600" class="instantgram-modal-db">Download</button>`

                modalBody += `</div>`
              }
            }

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
            } else {
              found = true
              mediaType = MediaType.Image

              modalBody += `<img width="500" height="450" src="${media.src}" />`
              // Add download button
              modalBody += `<button onclick="downloadFromHref('${media.src}', '${userName + '_' + this.unixTimestampToDate(media.postedAt)}.jpg')" style="font-size:20px;font-weight:600;margin-top:-4px;" class="instantgram-modal-db">Download</button>`
            }

            modal.callback = null
          }
        }

        modal.body = [modalBody]
        modal.refresh()

      } else {
        console.log("Could not find container element");
      }

      callback(found, mediaType, null, program)
    } catch (e) {
      console.error(this.getName() + "()", `[instantgram] ${program.VERSION}`, e)
      callback(false, null, program)
    }
    /* =====  End of StoriesScanner ======*/
  }
}