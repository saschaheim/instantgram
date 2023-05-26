import { Program } from "../App"
import { Module } from "./Module"
import { MediaType } from "../model/mediaType"
import { htmlSpinnerMarkup } from "../components/Interconnect"
import { Modal } from "../components/Modal"
import getElementInViewPercentage from "../helpers/getElementInViewPercentage"
import localize from "../helpers/localize"

export class ReelsScanner implements Module {
    private selectedSidecarIndex: number

    public getName(): string {
        return "ReelsScanner"
    }

    public getPostId(): string {
        const url = window.location.href
        const regex = /\/p\/([a-zA-Z0-9_-]+)/
        const postId = url.match(regex)?.[1]

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
         =              ReelsScanner            =
         ==================================== */
        try {
            // Define default variables
            let mediaEl = null
            let mediaType: MediaType = MediaType.UNDEFINED

            // All grabed feed posts
            let $articles: any

            // Article
            let $article: any

            let mediaUrl: string

            // Scanner begins
            if (mediaEl == null) {
                $articles = document.querySelectorAll('section > main > div > div')
                $articles = Array.from($articles).filter(function (element) {
                    return (<any>element).children.length > 0
                })

                let mediaElInfos: any[] = []
                // Find needed post
                for (let i1 = 0; i1 < $articles.length; i1++) {
                    let mediaEl = $articles[i1]

                    if (mediaEl != null && typeof mediaEl.getBoundingClientRect() != null) {
                        let elemVisiblePercentage = getElementInViewPercentage(mediaEl)
                        mediaElInfos.push({ i1, mediaEl, elemVisiblePercentage })
                    } else {
                        mediaElInfos.push({ i1, mediaEl, elemVisiblePercentage: 0 })
                    }
                }

                let objMax = mediaElInfos.reduce((max, current) => max.elemVisiblePercentage > current.elemVisiblePercentage ? max : current)
                $article = $articles[objMax.i1]
            }

            if (typeof $article !== 'undefined' || $article !== null || $article !== '') {
                const $reactPostEl = [...Array.from($article.querySelectorAll('*'))].filter((element) => {
                    const instanceKey = Object.keys(element).find((key) => key.includes('Instance') || key.includes('Fiber'))
                    const $react = element[instanceKey]
                    return $react?.return?.return?.return?.memoizedProps.post ?? false
                })[0]
                const $reactInstanceKey = Object.keys($reactPostEl).find(key => key.includes('Instance') || key.includes('Fiber'))
                const $reactPostNode = $reactPostEl[$reactInstanceKey]

                const userName = this.getUserName($reactPostNode)

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

                modal.body = [modalBody]
                modal.refresh()
            }

            callback(found, mediaType, mediaUrl, program)
        } catch (e) {
            console.error(this.getName() + "()", `[instantgram] ${program.VERSION}`, e)
            callback(false, null, program)
        }
        /* =====  End of ReelsScanner ======*/
    }
}