export default function getBlobVideoUrl(el: HTMLVideoElement, callback: any) {

    const instanceKey = Object.keys(el).find(key => key.includes('Instance'))
    const reactVideoEl = el[instanceKey]
    const videoUrl = reactVideoEl.return.memoizedProps.fallbackSrc

    callback(videoUrl.length > 0 ? videoUrl : false)
}