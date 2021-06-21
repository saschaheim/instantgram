import getDataFromUrl from './getDataFromUrl'

async function getBlobVideoUrl(el: HTMLVideoElement, article: Element, pos: number, callback: any) {

    if (Object.keys(el).length > 0) {
        const instanceKey = Object.keys(el).find(key => key.includes('Instance'));

        if (typeof instanceKey !== 'undefined') {
            const reactVideoEl = el[instanceKey];

            if (typeof reactVideoEl !== 'undefined') {
                const videoUrl = reactVideoEl.return.memoizedProps.fallbackSrc;

                if (typeof videoUrl !== 'undefined') {
                    callback(videoUrl.length > 0 ? videoUrl : false);
                } else {
                    /* Will be used only for single video posts */
                    let isMultiVideo = (pos != null) ? true : false;
                    if (!isMultiVideo) {
                        let posterRegex = /poster\=\"([\s\S]*)\" preload/gm;
                        let posterRegexMatch = posterRegex.exec(el.outerHTML.replace(/(\r\n|\n|\r)/gm, ''));
                        let videoPosterUrl = null;
                        if (posterRegexMatch) {
                            // HACK 
                            let div = document.createElement('textarea');
                            div.innerHTML = posterRegexMatch[1];
                            let decoded = div.firstChild.nodeValue;
                            videoPosterUrl = decoded;
                        }
                        var videoPosterFilename = videoPosterUrl.split('/').pop().split('#')[0].split('?')[0];
                    }

                    /* Step 1 */
                    /* Fetch user id from element */
                    let userId = null;
                    let userProfileUrl = (article.querySelectorAll('header > div > div > div > span > a')[0] as HTMLLinkElement).href;
                    let userProfileUrlResponseData = await getDataFromUrl(userProfileUrl);

                    if (userProfileUrlResponseData) {
                        userProfileUrlResponseData = userProfileUrlResponseData.replace(/(\r\n|\n|\r)/gm, '');

                        let m;
                        let entries;
                        let regex = /profilePage_([0-9]+)/gm;
                        while ((m = regex.exec(userProfileUrlResponseData)) !== null) {
                            // This is necessary to avoid infinite loops with zero-width matches
                            if (m.index === regex.lastIndex) {
                                regex.lastIndex++;
                            }

                            // The result can be accessed through the `m`-variable.
                            m.forEach((match, groupIndex) => {
                                userId = match;
                            })
                        }
                    }

                    /* Step 2 */
                    /*  Fetch the user data until the file name is found */
                    let videoUrl = null;
                    if (userId) {
                        let userMediaFeedResponseData = await getDataFromUrl('https://www.instagram.com/graphql/query/?query_hash=003056d32c2554def87228bc3fd9668a&variables={"id":' + userId + ',"first":100}');
                        if (userMediaFeedResponseData) {
                            let json = JSON.parse(userMediaFeedResponseData);

                            for (let _fI = 0; _fI < json.data.user.edge_owner_to_timeline_media.edges.length; _fI++) {
                                // Handle different instagram post types
                                // Single Video
                                if (!isMultiVideo) {
                                    if (json.data.user.edge_owner_to_timeline_media.edges[_fI].node.__typename == 'GraphVideo') {
                                        let GraphVideoNode = json.data.user.edge_owner_to_timeline_media.edges[_fI].node;
                                        if (videoPosterFilename == GraphVideoNode.display_url.split('/').pop().split('#')[0].split('?')[0]) {
                                            videoUrl = GraphVideoNode.video_url;

                                            // There exists only one node so break it no need to further analyze
                                            break;
                                        }
                                    }
                                    // Multi Post which can have a video
                                } else {
                                    if (json.data.user.edge_owner_to_timeline_media.edges[_fI].node.__typename == 'GraphSidecar') {
                                        if (json.data.user.edge_owner_to_timeline_media.edges[_fI].node.hasOwnProperty('edge_sidecar_to_children')) {
                                            let GraphSidecarNode = json.data.user.edge_owner_to_timeline_media.edges[_fI].node.edge_sidecar_to_children.edges[pos].node;
                                            videoUrl = GraphSidecarNode.video_url;

                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    callback(videoUrl ? videoUrl : false);
                }
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    } else {
        callback(false);
    }
}

export default getBlobVideoUrl;