import getHighestResImg from '../helpers/getHighestResImg.js'

export default async function searchImageVideoInStories(program) {
    var found = false

    if (program.regexStoriesURI.test(program.path)) {

        /* ======================================
         =     Search image/video in stories    =
         ===================================== */
        try {
            const $root = document.getElementById('react-root')

            const $video = $root.querySelectorAll('video > source')
            const $img = $root.querySelectorAll('img[srcset]')

            let _videoUrl = null
            let _imgUrl = null

            if ($video.length > 0) {
                found = true
                program.foundVideo = true
                program.foundByModule = 'searchImageVideoInStories'

                // Fix url timestamp error or signature mismatch
                _videoUrl = $video[0].src.replace('amp;', '&')
                window.open(_videoUrl)
            } else {
                let _mediaEl
                for (let i = 0; i < $img.length; i++) {
                    if ($img[i].className.length > 0) {
                        _mediaEl = $img[i]
                        break
                    }
                }

                if (_imgUrl = await getHighestResImg(_mediaEl)) {
                    found = true
                    program.foundImage = true
                    program.foundByModule = 'searchImageVideoInStories'

                    // Fix url timestamp error or signature mismatch
                    _imgUrl = _imgUrl.replace('amp;', '&')
                    window.open(_imgUrl)
                } else {
                    found = false
                    program.foundImage = false
                }
            }

            if (found === false) {
                if (program.videos.length > 0) {
                    let videoLink = program.videos[0].src

                    if (!videoLink && program.videos[0].children) {
                        videoLink = program.videos[0].children[0].src
                    }

                    if (videoLink) {
                        window.open(videoLink)
                        found = true
                        program.foundVideo = true
                        program.foundByModule = 'searchImageVideoInStories'
                    }
                }
            }

        } catch (e) {
            console.error('searchImageVideoInStories()', `[instantgram] ${program.VERSION}`, e)
        }
        /* =====  End of search image/video in stories  ======*/

    }

    return found
}