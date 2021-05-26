import { Program } from '../App'
import { Module } from './Module'
import getHighestResImg from '../helpers/getHighestResImg'

export class ImageVideoInStories implements Module {

	public getName(): string {
		return 'ImageVideoInStories'
	}

	public async execute(program: Program): Promise<any> {
		let found = false

		if (program.regexStoriesURI.test(program.path)) {

			/* ======================================
			 =     Search image/video in stories    =
			 ===================================== */
			try {
				const $root = document.getElementById('react-root')

				const $video = $root.querySelectorAll('video > source') as NodeListOf<HTMLVideoElement>
				const $img = $root.querySelectorAll('img[srcset]') as unknown as HTMLImageElement

				let _videoUrl = null
				let _imgUrl = null

				if ($video.length > 0) {
					// Fix url timestamp error or signature mismatch
					_videoUrl = $video[0].src.replace('amp;', '&')

					found = true
					program.foundImage = false
					program.foundVideo = true
					program.foundByModule = this.getName()

					/* Fix error network error since mai 2021 cannot download */
					window.open(_videoUrl + '&dl=1')
				} else {
					let _mediaEl
					for (let i = 0; i < (<any>$img).length; i++) {
						if ($img[i].className.length > 0) {
							_mediaEl = $img[i]
							break
						}
					}

					let helperResult = await getHighestResImg(_mediaEl)
					if (typeof helperResult === 'string') {
						_imgUrl = helperResult

						// Fix url timestamp error or signature mismatch
						_imgUrl = _imgUrl.replace('amp;', '&')

						found = true
						program.foundImage = true
						program.foundVideo = false
						program.foundByModule = this.getName()

						window.open(_imgUrl)
					} else {
						found = false
						program.foundImage = false
						program.foundVideo = false
						program.foundByModule = undefined
					}
				}
			} catch (e) {
				console.error(this.getName() + '()', `[instantgram] ${program.VERSION}`, e)
			}
			/* =====  End of search image/video in stories  ======*/
		}

		return found
	}
}