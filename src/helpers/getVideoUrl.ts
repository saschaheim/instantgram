import getPath from "../helpers/getPath"

async function getVideoUrl(el: HTMLVideoElement, callback: any) {
    // No blob video but src return it
    if (el.src && !el.src.startsWith("blob:")) {
        callback(el.src)

        return false
    }

    const instanceKey = Object.keys(el).find(key => key.includes('Instance') || key.includes('Fiber'))
    const $react = el[instanceKey]

    // Found mpd manifest, so extract our magic
    if ($react.return.return.memoizedProps.manifest) {
        var domManifestParser = new DOMParser().parseFromString($react.return.return.memoizedProps.manifest, "text/xml")
        var s = Array.from(domManifestParser.querySelectorAll('Representation[mimeType="video/mp4"][FBQualityClass="hd"]')).map(function l(_e) {
            var z, nope
            return {
                quality: _e.getAttribute("FBQualityClass"),
                bandwidth: parseInt(_e.getAttribute("bandwidth")),
                baseUrl: null === (nope = null === (z = _e.querySelector("BaseURL")) || void 0 === z ? void 0 : z.textContent) || void 0 === nope ? void 0 : nope.trim()
            }
        }).filter(function (e) {
            return e.baseUrl
        })

        var lol
        callback(s.sort(function compare(x, y) {
            return "hd" === x.quality && "hd" !== y.quality ? -1 : "hd" !== x.quality && "hd" === y.quality ? 1 : y.bandwidth - x.bandwidth
        }), null === (lol = s[0]) || void 0 === lol ? void 0 : lol.baseUrl)
    } else {
        let $videoURL: string | any[]
        let $videoType: string

        if ($react.return.return.memoizedProps.hdSrc) {
            $videoURL = $react.return.return.memoizedProps.hdSrc
            $videoType = 'hd'
        } else if ($react.return.return.memoizedProps.sdSrc) {
            $videoURL = $react.return.return.memoizedProps.sdSrc
            $videoType = 'sd'
        } else if ($react.return.return.memoizedProps.children[0].props.fallbackSrc) {
            $videoURL = $react.return.return.memoizedProps.children[0].props.fallbackSrc
            $videoType = 'fallback'
        } else {
            $videoURL = null
            $videoType = null
        }

        if ($videoURL.length > 80) {
            if ($videoType == 'fallback') {
                /* Fix error network error since mai 2021 cannot download */
                let fixedUrl = "https://scontent.cdninstagram.com" + getPath($react.return.return.memoizedProps.children[0].props.fallbackSrc, "unknown")
                callback(fixedUrl)
            } else {
                callback($videoURL)
            }
        } else {
            callback(null)
        }
    }

    return false
}
export default getVideoUrl