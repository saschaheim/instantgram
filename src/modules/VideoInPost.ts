import { Program } from '../App';
import { Module } from './Module';
import localize from '../helpers/localize';
import getBlobVideoUrl from '../helpers/getBlobVideoUrl';
import getPreLoader from '../helpers/getPreLoader';
import isElementInViewport from '../helpers/isElementInViewport';
import getLoadingDots from '../helpers/getLoadingDots';
import { Modal } from '../components/Modal';

export class VideoInPost implements Module {

	private modal: Modal = new Modal();

	public getName(): string {
		return 'VideoInPost';
	}

	public async execute(program: Program, callback: any): Promise<any> {
		let found = false;

		/* =====================================
		 =        Search video in post         =
		 ==================================== */
		try {
			if (document.getElementsByTagName('article') != null && document.getElementsByTagName('article').length === 1) {
				const $container = document.querySelector('main');
				const $article = $container.querySelectorAll('div > div > article');

				let mediaEl;
				let videoLink;
				for (var i = 0; i < $article.length; i++) {
					if (isElementInViewport($article[i])) {
						/*
						 Single video
						 */
						let singleVideo = $article[i].querySelector('div > div > div > div > video');
						if (singleVideo != null) {
							mediaEl = singleVideo;
							videoLink = (singleVideo as HTMLVideoElement).src;
							break;
						}
					}
				}

				// Next
				/*
				 Series video
				 */
				let _currentSelectedControlIndex = null
				if (i != null && $article != null && $article[i] != null) {
					let multiVideo = Array.from($article[i].querySelectorAll('div > div > div > div > div > div > div > ul:first-child > li')).filter(el => (el.firstChild != null && el.classList.length > 0));
					if (multiVideo != null && multiVideo.length > 0) {
						mediaEl = null;
						videoLink = null;

						let _isLastMedia = false
						let controlsArray = Array.from($article[0].children[2].querySelector('div > div').children[1].children);
						// detect some things
						for (let _i = 0; _i < controlsArray.length; _i++) {

							if (controlsArray[_i].classList.length > 1) {
								_currentSelectedControlIndex = _i;
							}

							// Is last media
							if (_currentSelectedControlIndex == controlsArray.length - 1) {
								_isLastMedia = true;
								break;
							}
						}

						for (let i = 0; i < multiVideo.length; i++) {

							// First
							if (multiVideo.length == 2) {
								if (_isLastMedia) {
									mediaEl = multiVideo[1];
								} else {
									mediaEl = multiVideo[0];
								}
							} else if (multiVideo.length == 3) {
								if (_isLastMedia) {
									mediaEl = multiVideo[2];
								} else {
									mediaEl = multiVideo[1];
								}
							} else if (multiVideo.length == 4) {
								if (_isLastMedia) {
									mediaEl = multiVideo[2];
								} else {
									if (controlsArray.length > 6 && _currentSelectedControlIndex == 4) {
										mediaEl = multiVideo[1];
									} else if (controlsArray.length > 6 && _currentSelectedControlIndex == 5) {
										mediaEl = multiVideo[2];
									} else if (controlsArray.length > 6 && _currentSelectedControlIndex == 6) {
										mediaEl = multiVideo[2];
									} else if (controlsArray.length > 6 && _currentSelectedControlIndex == 7) {
										mediaEl = multiVideo[1];
									} else if (controlsArray.length > 6 && _currentSelectedControlIndex == 8) {
										mediaEl = multiVideo[2];
									} else {
										mediaEl = multiVideo[_currentSelectedControlIndex - 1];
									}
								}
							}

							if (mediaEl != null && mediaEl.querySelector('video') != null) {
								videoLink = mediaEl.querySelector('video').src;
								break;
							}
						}
					}
				}

				if (videoLink) {
					if (videoLink.indexOf('blob:') !== -1) {
						const that = this;

						found = true;
						program.foundImage = false;
						program.foundVideo = true;
						program.foundByModule = that.getName();

						let loadingDots;

						this.modal.heading = [
							`<h5>[instantgram] <span style="float:right">v${program.VERSION}</span></h5>`
						];
						this.modal.content = [
							"<p style='margin:0;text-align:center'>" + getPreLoader() + "</p>",
							"<h4 style='font-weight:bold;text-align:center'>" + localize('modules.modal@isLoading') + "<span id='loading_dot' style='position:fixed;'></span></h4>"
						];
						this.modal.open();

						setTimeout(function () {
							getBlobVideoUrl(mediaEl, $article[i], _currentSelectedControlIndex, function (scrapedBlobVideoUrl: string) {
								that.modal.close();
								//clearInterval(loadingDots)

								if (scrapedBlobVideoUrl) {
									/* Fix error network error since mai 2021 cannot download */
									let _newVideoUrl = scrapedBlobVideoUrl.replace(/^[^.]*/, 'https://scontent');
									window.open(_newVideoUrl);

									callback(found, program);
								} else {
									this.modal.heading = [
										`<h5>[instantgram] <span style="float:right">v${program.VERSION}</span></h5>`
									];
									this.modal.content = [
										localize('index#program#blob@alert_cannotDownload')
									];
									this.modal.buttonList = [{
										active: true,
										text: localize('index#program#blob@alert_cannotDownload')
									}];
									this.modal.open();

									callback(found, program);
								}
							});
						}, 500);
					} else {
						found = true;
						program.foundImage = false;
						program.foundVideo = true;
						program.foundByModule = this.getName();

						/* Fix error network error since mai 2021 cannot download */
						let _newVideoUrl = videoLink.replace(/^[^.]*/, 'https://scontent');
						window.open(_newVideoUrl);

						callback(found, program);
					}
				} else {
					found = false;
					program.foundImage = false;
					program.foundVideo = false;
					program.foundByModule = undefined;

					callback(found, program);
				}
			} else {
				found = false;
				program.foundImage = false;
				program.foundVideo = false;
				program.foundByModule = undefined;

				callback(found, program);
			}
		}
		catch (e) {
			console.error(this.getName() + '()', `[instantgram] ${program.VERSION}`, e);
		}
		/* =====  End of search video in post  ======*/
	}
}