import { Program } from '../App';
import { Module } from './Module';
import { Modal } from '../components/Modal';
import getHighestResImg from '../helpers/getHighestResImg';
import getBlobVideoUrl from '../helpers/getBlobVideoUrl';
import getPath from '../helpers/getPath';
import getPreLoader from '../helpers/getPreLoader';
import isElementInViewport from '../helpers/isElementInViewport';
import localize from '../helpers/localize';

enum MediaType {
	Image = 'IMAGE',
	Video = 'VIDEO',
	undefined = 'UNDEFINED'
}

export class MediaScanner implements Module {

	private modal: Modal = new Modal();

	public getName(): string {
		return 'MediaScanner';
	}

	/** @suppress {uselessCode} */
	public async execute(program: Program, callback?: any): Promise<any> {
		let found = false;

		/* =====================================
		 =             MediaScanner            =
		 ==================================== */
		try {
			// Define default variables
			let isStory: boolean = false;
			let isModal: boolean = false;
			let isCarousel: boolean = false;

			let $mediaEl = null;
			let mediaType: MediaType = MediaType.undefined;
			let mediaLink: string = null;

			let predictNeededElement = null;
			let predictNeededElementIndex = 0;

			let selectedControlIndex: number;
			let isLastMedia: boolean = false;

			// Container
			let $container = document.querySelector('main');

			// Article
			let $article: Element | NodeListOf<Element>;

			// Handle specific modules
			if (program.regexProfilePath.test(program.path)) {
				found = false;
				program.foundImage = false;
				program.foundVideo = false;
				program.foundByModule = undefined;

				callback(found, program);
				return;
			}

			// Detect story video/image
			if (program.regexStoriesURI.test(program.path)) {
				$container = document.getElementById('react-root');

				let storys = $container.querySelectorAll('section > div > div > div');

				for (let i = 0; i < (<any>storys).length; i++) {
					let scaleX = Number((Math.round(storys[i].getBoundingClientRect().width / (<HTMLElement>storys[i]).offsetWidth * 100) / 100).toFixed(2));

					if (scaleX >= 1) {
						if (storys[i].classList.length > 1) {
							let isVideo = storys[i].querySelector('video') !== null;
							let isImage = storys[i].querySelector('div > div img[src]') !== null || storys[i].querySelector('div > div img[srcset]') !== null;

							if (isVideo && isImage) {
								// Set media type
								mediaType = MediaType.Video;

								$mediaEl = storys[i].querySelector('video');
							} else if (isImage) {
								// Set media type
								mediaType = MediaType.Image;

								// Sometimes there exists no source set so be careful
								if (storys[i].querySelectorAll('img')[0] !== null) {
									$mediaEl = storys[i].querySelectorAll('img')[0];
								}
							}

							break;
						}
					}
				}
			}

			if ($mediaEl == null) {
				// Detect modal post
				isModal = document.querySelectorAll('[role="dialog"]').length > 0;
				if (process.env.DEV) {
					console.log(['isModal', isModal]);
				}

				// Detect carousel
				if (isModal) {
					predictNeededElement = document.getElementsByTagName('article');
					if (predictNeededElement != null) {
						for (predictNeededElementIndex = 0; predictNeededElementIndex < predictNeededElement.length; predictNeededElementIndex++) {
							if (predictNeededElement[predictNeededElementIndex].classList.length >= 4) {
								break;
							}
						}
					}

					isCarousel = document.querySelector('article div > div > div > div > button._6CZji') !== null || document.querySelector('article div > div > div > div > button.POSa_') !== null;
				} else {
					if (program.regexRootPath.test(program.path)) {
						$container = document.querySelector('main > section');
						$article = $container.querySelectorAll('div > div > div > article');

						let i1 = 0;
						for (i1 = 0; i1 < $article.length; i1++) {
							if (isElementInViewport($article[i1])) {
								isCarousel = $article[i1].querySelector('button > .coreSpriteLeftChevron') !== null || $article[i1].querySelector('button > .coreSpriteRightChevron') !== null;
								break;
							}
						}
					} else {
						isCarousel = document.querySelector('main div > div > article div > div > div > div > button._6CZji') !== null || document.querySelector('main div > div > article div > div > div > div > button.POSa_') !== null;
					}
				}

				if (process.env.DEV) {
					console.log(['isCarousel', isCarousel]);
				}

				/*
				* For carousel
				*/
				if (isCarousel) {
					$article = document.getElementsByTagName('article')[predictNeededElementIndex];

					let multiImage: Element[] | NodeListOf<Element>;

					// Change structure if is on main feed
					let cVPI = 0;
					if (program.regexRootPath.test(program.path)) {
						$container = document.querySelector('main > section');
						$article = $container.querySelectorAll('div > div > div > article');

						for (cVPI = 0; cVPI < $article.length; cVPI++) {
							if (isElementInViewport($article[cVPI])) {
								break;
							}
						}

						multiImage = Array.from($article[cVPI].querySelectorAll('div > div > div > div > div > div > div > ul:first-child > li')).filter(el => (el.firstChild != null && el.classList.length > 0));
					} else {
						multiImage = Array.from($article.querySelectorAll('div > div > div > div > div > div > div > ul:first-child > li')).filter(el => (el.firstChild != null && el.classList.length > 0));
					}

					if (multiImage != null && multiImage.length > 0) {
						$mediaEl = null;
						mediaLink = null;

						let controlsArray;
						// Change structure if is on main feed
						if (program.regexRootPath.test(program.path)) {
							// Selected article
							//console.log($article[cVPI]);
							
							//console.log(($article[cVPI] as HTMLElement).children[0].children[1].children[0].children[1].children)
							controlsArray = Array.from(($article[cVPI] as HTMLElement).children[0].children[1].children[0].children[1].children);
						} else {
							// Selected article
							//console.log($article);
							
							//console.log(($article as HTMLElement).children[0].children[0].children[0].children[1].children);
							controlsArray = Array.from(($article as HTMLElement).children[0].children[0].children[0].children[1].children);
						}

						// Detect current image index
						for (let miCI = 0; miCI < controlsArray.length; miCI++) {

							if (controlsArray[miCI].classList.length > 1) {
								selectedControlIndex = miCI;
							}

							// Is last media
							if (selectedControlIndex == controlsArray.length - 1) {
								isLastMedia = true;
								break;
							}
						}

						for (let i = 0; i < multiImage.length; i++) {
							// First
							if (multiImage.length == 2) {
								if (isLastMedia) {
									$mediaEl = multiImage[1];
								} else {
									$mediaEl = multiImage[0];
								}
							} else if (multiImage.length == 3) {
								if (isLastMedia) {
									$mediaEl = multiImage[2];
								} else {
									$mediaEl = multiImage[1];
								}
							} else if (multiImage.length == 4) {
								if (isLastMedia) {
									$mediaEl = multiImage[2];
								} else {
									if (controlsArray.length > 6 && selectedControlIndex == 4) {
										$mediaEl = multiImage[1];
									} else if (controlsArray.length > 6 && selectedControlIndex == 5) {
										$mediaEl = multiImage[2];
									} else if (controlsArray.length > 6 && selectedControlIndex == 6) {
										$mediaEl = multiImage[2];
									} else if (controlsArray.length > 6 && selectedControlIndex == 7) {
										$mediaEl = multiImage[1];
									} else if (controlsArray.length > 6 && selectedControlIndex == 8) {
										$mediaEl = multiImage[2];
									} else {
										$mediaEl = multiImage[selectedControlIndex - 1];
									}
								}
							}

							// Detect media type
							if ($mediaEl != null) {
								let isVideo = $mediaEl.querySelector('video') !== null;
								let isImage = $mediaEl.querySelector('img[src]') !== null || $mediaEl.querySelector('img[srcset]') !== null;

								if (isVideo) {
									// Set media type
									mediaType = MediaType.Video;

									$mediaEl = $mediaEl.querySelector('video');
									break;
								} else if (isImage) {
									// Set media type
									mediaType = MediaType.Image;

									// Sometimes there exists no source set so be careful
									if ($mediaEl.querySelector('img[srcset]') !== null) {
										$mediaEl = $mediaEl.querySelector('img[srcset]');
									} else {
										// Use source
										$mediaEl = $mediaEl.querySelector('img[src]');
									}
									break;
								}
							}
						}
					}
					/*
					* For single image
					*/
				} else {
					let $article: Element | NodeListOf<Element>;

					if (isModal) {
						$article = document.getElementsByTagName('article')[predictNeededElementIndex];

						let isVideo = $article.querySelector('video') !== null;
						let isImage = $article.querySelector('img[src]') !== null || $article.querySelector('img[srcset]') !== null;

						if (isVideo) {
							// Set media type
							mediaType = MediaType.Video;

							$mediaEl = $article.querySelector('video');
						} else if (isImage) {
							// Set media type
							mediaType = MediaType.Image;

							// Sometimes there exists no source set so be careful
							if ($article.querySelector('img[srcset]') !== null) {
								$mediaEl = $article.querySelector('img[srcset]');
							} else {
								// Use source
								$mediaEl = $article.querySelector('img[src]');
							}
						}
					} else {
						// Change structure if is on main feed
						if (program.regexRootPath.test(program.path)) {
							$container = document.querySelector('main > section');
							$article = $container.querySelectorAll('div > div > div > article');
						} else {
							if ($container) {
								$article = $container.querySelectorAll('div > div > article');
							}
						}

						if ($article) {
							for (var i = 0; i < ($article as NodeListOf<Element>).length; i++) {
								if (isElementInViewport($article[i])) {
									let isVideo = $article[i].querySelector('div > div > div > div > video') !== null;
									let isImage = $article[i].querySelector('div > div > div > div > img[src]') !== null || $article[i].querySelector('div > div > div > div > img[srcset]') !== null;

									if (isVideo) {
										// Set media type
										mediaType = MediaType.Video;

										$mediaEl = $article[i].querySelector('video');
									} else if (isImage) {
										// Set media type
										mediaType = MediaType.Image;

										// Sometimes there exists no source set so be careful
										if ($article[i].querySelector('img[srcset]') !== null) {
											$mediaEl = $article[i].querySelector('img[srcset]');
										} else {
											// Use source
											$mediaEl = $article[i].querySelector('img[src]');
										}
									}
								}
							}
						}
					}
				}
			}

			if (process.env.DEV) {
				console.log(['mediaType', mediaType]);
			}

			switch (mediaType) {
				case MediaType.Image:
					// Get highest image if possible
					let helperResult = await getHighestResImg($mediaEl);
					if (typeof helperResult === 'string') {
						mediaLink = helperResult;
					}

					if (mediaLink != null && mediaLink.length > 10) {
						found = true;
						program.foundImage = true;
						program.foundVideo = false;
						program.foundByModule = this.getName();

						window.open(mediaLink);

						callback(found, program);
					} else {
						found = false;
						program.foundImage = false;
						program.foundVideo = false;
						program.foundByModule = undefined;

						callback(found, program);
					}
					break;
				case MediaType.Video:
					if (typeof ($mediaEl as HTMLVideoElement).src === 'undefined' || ($mediaEl as HTMLVideoElement).src.length == 0) {
						$mediaEl = $mediaEl.querySelectorAll('source');
						mediaLink = ($mediaEl as HTMLVideoElement)[0].src;
					} else {
						mediaLink = ($mediaEl as HTMLVideoElement).src;
					}

					if (mediaLink != null && mediaLink.length > 10) {
						// Fix url timestamp error or signature mismatch
						mediaLink = mediaLink.replace('amp;', '&');

						if (mediaLink.indexOf('blob:') !== -1) {
							const that = this;

							found = true;
							program.foundImage = false;
							program.foundVideo = true;
							program.foundByModule = that.getName();

							this.modal.heading = [
								`<h5>[instantgram] <span style="float:right">v${program.VERSION}</span></h5>`
							];
							this.modal.content = [
								"<p style='margin:0;text-align:center'>" + getPreLoader() + "</p>",
								"<h4 style='font-weight:bold;text-align:center'>" + localize('modules.modal@isLoading') + "<span id='loading_dot' style='position:fixed;'></span></h4>"
							];
							this.modal.open();

							setTimeout(function () {
								getBlobVideoUrl($mediaEl, $article, selectedControlIndex, function (scrapedBlobVideoUrl: string) {
									that.modal.close();
									//clearInterval(loadingDots)

									if (scrapedBlobVideoUrl) {
										/* Fix error network error since mai 2021 cannot download */
										let _newVideoUrl = 'https://scontent.cdninstagram.com' + getPath(scrapedBlobVideoUrl, 'unknown');
										window.open(_newVideoUrl);

										callback(found, program);
									} else {
										that.modal.heading = [
											`<h5>[instantgram] <span style="float:right">v${program.VERSION}</span></h5>`
										];
										that.modal.content = [
											localize('index#program#blob@alert_cannotDownload')
										];
										that.modal.contentStyle = 'text-align:center',
											that.modal.buttonList = [{
												active: true,
												text: localize('index#program#blob@alert_cannotDownload')
											}];
										that.modal.open();

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
							let _newVideoUrl = 'https://scontent.cdninstagram.com' + getPath(mediaLink, 'unknown');
							window.open(_newVideoUrl);

							callback(found, program);
						};
					} else {
						found = false;
						program.foundImage = false;
						program.foundVideo = false;
						program.foundByModule = undefined;

						callback(found, program);
					}
					break;

				default:
					found = false;
					program.foundImage = false;
					program.foundVideo = false;
					program.foundByModule = undefined;

					callback(found, program);
					break;
			}
		} catch (e) {
			console.error(this.getName() + '()', `[instantgram] ${program.VERSION}`, e);
			callback(false, program);
		}
		/* =====  End of MediaScanner ======*/
	}
}