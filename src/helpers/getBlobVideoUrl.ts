export default function getBlobVideoUrl(el: HTMLVideoElement, callback: any) {

    if (Object.keys(el).length > 0) {
        const instanceKey = Object.keys(el).find(key => key.includes('Instance'))

        if (typeof instanceKey !== 'undefined') {
            const reactVideoEl = el[instanceKey]

            if (typeof reactVideoEl !== 'undefined') {
                const videoUrl = reactVideoEl.return.memoizedProps.fallbackSrc

                callback(videoUrl.length > 0 ? videoUrl : false)
            } else {
                callback(false)
            }
        } else {
            callback(false)
        }
    } else {
        callback(false)
    }
}