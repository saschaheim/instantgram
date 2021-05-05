import forEach from '../helpers/forEach.js'
import getDataFromUrl from '../helpers/getDataFromUrl.js'

export default function getBlobVideoUrl(videoEl, callback) {

    const instanceKey = Object.keys(videoEl).find(key => key.includes('Instance'))
    const reactVideoEl = videoEl[instanceKey]
    const videoUrl = reactVideoEl.return.memoizedProps.fallbackSrc

    callback(videoUrl.length > 0 ? videoUrl : false)
}