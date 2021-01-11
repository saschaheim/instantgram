import forEach from '../helpers/forEach.js'
import getDataFromUrl from '../helpers/getDataFromUrl.js'

export default function getBlobVideoUrl(article, el, pos, callback) {

    // Define some things
    let isMultiVideo = (pos != null) ? true : false
    let userId = null
    let userName = article.querySelectorAll('header > div > div > div > span > a')[0].text
    let userProfileUrl = article.querySelectorAll('header > div > div > div > span > a')[0].href
    let videoUrl = null

    // Will be used only for single video posts
    if (!isMultiVideo) {
        var posterRegex = /poster\=\"([\s\S]*)\" preload/gm
        var posterRegexMatch = posterRegex.exec(el.outerHTML.replace(/(\r\n|\n|\r)/gm, ''))
        var videoPosterUrl = null
        if (posterRegexMatch) {
            // HACK 
            let div = document.createElement('textarea')
            div.innerHTML = posterRegexMatch[1]
            let decoded = div.firstChild.nodeValue
            //div.parentNode.removeChild(div)

            videoPosterUrl = decoded
        }
        var videoPosterFilename = videoPosterUrl.split('/').pop().split('#')[0].split('?')[0]
    }
    //

    // Stage 1
    // Fetch user id from element
    let userProfileUrlResponseData = null
    getDataFromUrl(userProfileUrl, function(data) {
        userProfileUrlResponseData = data
    })

    if (userProfileUrlResponseData) {
        userProfileUrlResponseData = userProfileUrlResponseData.replace(/(\r\n|\n|\r)/gm, '')

        let m
        let entries
        let regex = /profilePage_([0-9]+)/gm
        while ((m = regex.exec(userProfileUrlResponseData)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++
            }

            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                userId = match
            })
        }
    }

    // Stage 2
    // Fetch the user data until the file name is found
    if (userId) {
        let userMediaFeedResponseData = null
        getDataFromUrl('https://www.instagram.com/graphql/query/?query_hash=003056d32c2554def87228bc3fd9668a&variables={"id":' + userId + ',"first":100}', function(data) {
            userMediaFeedResponseData = data
        })

        if (userMediaFeedResponseData) {
            let json = JSON.parse(userMediaFeedResponseData)

            for (let _fI = 0; _fI < json.data.user.edge_owner_to_timeline_media.edges.length; _fI++) {
                // Handle different instagram post types
                // Single Video
                if (!isMultiVideo) {
                    if (json.data.user.edge_owner_to_timeline_media.edges[_fI].node.__typename == 'GraphVideo') {
                        let GraphVideoNode = json.data.user.edge_owner_to_timeline_media.edges[_fI].node
                        if (videoPosterFilename == GraphVideoNode.display_url.split('/').pop().split('#')[0].split('?')[0]) {
                            videoUrl = GraphVideoNode.video_url

                            // There exists only one node so break it no need to further analyze
                            break
                        }
                    }
                    // Multi Post which can have a video
                } else {
                    if (json.data.user.edge_owner_to_timeline_media.edges[_fI].node.__typename == 'GraphSidecar') {
                        if (json.data.user.edge_owner_to_timeline_media.edges[_fI].node.hasOwnProperty('edge_sidecar_to_children')) {
                            let GraphSidecarNode = json.data.user.edge_owner_to_timeline_media.edges[_fI].node.edge_sidecar_to_children.edges[pos].node
                            videoUrl = GraphSidecarNode.video_url

                            break
                        }
                    }
                }
            }
        }
    }

    callback(videoUrl ? videoUrl : false)
}