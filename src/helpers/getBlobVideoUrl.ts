import getDataFromUrl from "./getDataFromUrl"
import getDataFromIGUrl from "./getDataFromIGUrl"
import getFileNameWithoutExtension from "../helpers/getFileNameWithoutExtension"

async function getBlobVideoUrl(el: HTMLVideoElement, article: any, selectedControlIndex: number, callback: any) {
	// First try fastest method
	const instanceKey = Object.keys(el).find(key => key.includes('Instance') || key.includes('Fiber'))
	const $react = el[instanceKey]
	const videoLink = $react.return.memoizedProps.fallbackSrc

	if (videoLink) {
		callback(videoLink)
		return true
		// If first method didnt work try second approach runs very slow
	} else {
		let isVideoFromSeries = (selectedControlIndex != null) ? true : false
		let videoPosterFilename = getFileNameWithoutExtension(el.poster)

		if (process.env.DEV) {
			console.log(['getBlobVideoUrl(): el', el])
			console.log(['getBlobVideoUrl(): el src', el.poster])
			console.log(['getBlobVideoUrl(): hasArticle', article !== null])
			console.log(['getBlobVideoUrl(): article', article])
			console.log(['getBlobVideoUrl(): isVideoFromSeries', isVideoFromSeries])
			console.log(['getBlobVideoUrl(): selectedControlIndex', selectedControlIndex])
			console.log(['getBlobVideoUrl(): videoPosterFilename', videoPosterFilename])
		}

		if (article !== null) {
			/* Step 1 */
			/* Fetch user id from element */
			let userId = null
			let userProfileUrl = ''
			if (article !== undefined && article.length > 0) {
				let articleClassListLengths = []
				for (let i = 0; i < article.length; i++) {
					articleClassListLengths[i] = article[i].classList.length
				}
				let newArticleIndex = articleClassListLengths.indexOf(Math.max(...articleClassListLengths))
				userProfileUrl = (article[newArticleIndex].querySelectorAll('header > div > div > div > div > span > a')[0] as HTMLLinkElement).href
			} else {
				userProfileUrl = (article.querySelectorAll('header > div > div > div > div > span > a')[0] as HTMLLinkElement).href
			}

			if (process.env.DEV) {
				console.log(['getBlobVideoUrl(): userProfileUrl', userProfileUrl])
			}

			let userProfileUrlResponseData = await getDataFromUrl(userProfileUrl)
			if (userProfileUrlResponseData) {
				userProfileUrlResponseData = userProfileUrlResponseData.replace(/(\r\n|\n|\r)/gm, '')

				let m
				let regex = /profilePage_([0-9]+)/gm
				while ((m = regex.exec(userProfileUrlResponseData)) !== null) {
					/* This is necessary to avoid infinite loops with zero-width matches */
					if (m.index === regex.lastIndex) {
						regex.lastIndex++
					}

					/* The result can be accessed through the `m`-variable. */
					m.forEach((match) => {
						userId = match
					})
				}
			}

			if (process.env.DEV) {
				console.log(['getBlobVideoUrl(): userId', userId])
			}

			/* Step 2 */
			/*  Fetch the user data until the file name is found */
			let videoUrl = null
			if (userId) {
				const query = `{"id":${userId},"first":100}`
				let userMediaFeedPosts = await getDataFromIGUrl('https://www.instagram.com/graphql/query/?query_hash=003056d32c2554def87228bc3fd9668a&variables=', query, videoPosterFilename)
				if (process.env.DEV) {
					console.log(['getBlobVideoUrl(): userMediaFeedPosts', userMediaFeedPosts])
				}

				if (userMediaFeedPosts) {
					let magicArr = userMediaFeedPosts[userMediaFeedPosts.length - 1]

					for (let _fI = 0; _fI < magicArr.user.edge_owner_to_timeline_media.edges.length; _fI++) {
						let GraphEdgeNode = magicArr.user.edge_owner_to_timeline_media.edges[_fI].node

						/* Multi Post which can have a video */
						if (isVideoFromSeries) {
							if (GraphEdgeNode.__typename == 'GraphSidecar') {
								if (GraphEdgeNode.hasOwnProperty('edge_sidecar_to_children')) {
									for (let edge in GraphEdgeNode.edge_sidecar_to_children.edges) {

										if (GraphEdgeNode.edge_sidecar_to_children.edges[edge].node.__typename == 'GraphVideo') {
											let GraphVideoNode = GraphEdgeNode.edge_sidecar_to_children.edges[edge].node

											if (videoPosterFilename == getFileNameWithoutExtension(GraphVideoNode.display_url)) {
												videoUrl = GraphVideoNode.video_url

												/* There exists only one node so break it no need to further analyze */
												break
											}
										}
									}
								}
							}
						} else {
							if (GraphEdgeNode.__typename == 'GraphVideo') {
								if (videoPosterFilename == getFileNameWithoutExtension(GraphEdgeNode.display_url)) {
									videoUrl = GraphEdgeNode.video_url

									/* There exists only one node so break it no need to further analyze */
									break
								}
							}
						}
					}
				}
			}

			callback(videoUrl ? videoUrl : null)
		} else {
			callback(null)
		}

		return true
	}
}
export default getBlobVideoUrl