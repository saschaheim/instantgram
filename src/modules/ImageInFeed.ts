import { Program } from '../App';
import { Module } from './Module';
import getHighestResImg from '../helpers/getHighestResImg';
import isElementInViewport from '../helpers/isElementInViewport';

export class ImageInFeed implements Module {

	public getName(): string {
		return 'ImageInFeed';
	}

	public async execute(program: Program, callback: any): Promise<any> {
		let found = false;

		/* =====================================
		 =        Search image in feed         =
		 ==================================== */
		try {
			searchImage: { // eslint-disable-line no-labels
				if (document.querySelectorAll('main > section') != null && document.querySelectorAll('main > section').length === 1) {
					const $container = document.querySelector('main > section');
					const $article = $container.querySelectorAll('div > div > div > article');

					let mediaEl = null;
					let imageLink = null;
					for (var i = 0; i < $article.length; i++) {
						if (isElementInViewport($article[i])) {
							/*
							 Single image
							 */
							let singleImageEl = $article[i].querySelector('div > div > div > div > img');
							if (singleImageEl != null) {
								mediaEl = singleImageEl;
								/* Get highest image if possible */
								let helperResult = await getHighestResImg(singleImageEl);
								if (typeof helperResult === 'string') {
									imageLink = helperResult;
								}
								break;
							}
						}
					}

					/*
					 Series image
					 */
					if (i != null && $article != null && $article[i] != null) {
						const multiImage = Array.from($article[i].querySelectorAll('div > div > div > div > div > div > div > ul:first-child > li')).filter(el => (el.firstChild != null && el.classList.length > 0));
						if (multiImage != null && multiImage.length > 1) {
							mediaEl = null;
							imageLink = null;

							let _currentSelectedControlIndex;
							let _isLastMedia = false;
							let controlsArray = Array.from($article[i].children[2].querySelector('div > div').children[1].children);
							/* detect some things */
							for (let _i = 0; _i < controlsArray.length; _i++) {

								if (controlsArray[_i].classList.length > 1) {
									_currentSelectedControlIndex = _i;
								}

								/* Is last media */
								if (_currentSelectedControlIndex == controlsArray.length - 1) {
									_isLastMedia = true;
									break;
								}
							}

							for (let i = 0; i < multiImage.length; i++) {

								if (multiImage.length == 2) {
									if (_isLastMedia) {
										mediaEl = multiImage[1];
									} else {
										mediaEl = multiImage[0];
									}
								} else if (multiImage.length == 3) {
									if (_isLastMedia) {
										mediaEl = multiImage[2];
									} else {
										mediaEl = multiImage[1];
									}
								} else if (multiImage.length == 4) {
									if (_isLastMedia) {
										mediaEl = multiImage[2];
									} else {
										if (controlsArray.length > 6 && _currentSelectedControlIndex == 4) {
											mediaEl = multiImage[1];
										} else if (controlsArray.length > 6 && _currentSelectedControlIndex == 5) {
											mediaEl = multiImage[2];
										} else if (controlsArray.length > 6 && _currentSelectedControlIndex == 6) {
											mediaEl = multiImage[2];
										} else if (controlsArray.length > 6 && _currentSelectedControlIndex == 7) {
											mediaEl = multiImage[1];
										} else if (controlsArray.length > 6 && _currentSelectedControlIndex == 8) {
											mediaEl = multiImage[2];
										} else {
											mediaEl = multiImage[_currentSelectedControlIndex - 1];
										}
									}
								}

								if (mediaEl != null && mediaEl.querySelector('img[srcset]') != null) {
									/* Get highest image if possible */
									let helperResult = await getHighestResImg(mediaEl.querySelector('img[srcset]'));
									if (typeof helperResult === 'string') {
										imageLink = helperResult;
									}
									break;
								} else {
									if (mediaEl.querySelector('img[src]') != null) {
										imageLink = (mediaEl.querySelector('img[src]') as HTMLImageElement).src;
									}
									break;
								}
							}
						}
					}

					/* bring the original image if had */
					program.setImageLink(imageLink);

					if (program.imageLink) {
						found = true;
						program.foundImage = true;
						program.foundVideo = false;
						program.foundByModule = this.getName();

						window.open(imageLink);

						callback(found, program);
					} else {
						found = false;
						program.foundImage = false;
						program.foundVideo = false;
						program.foundByModule = undefined;

						callback(found, program);
					}

					/* if found the image stop searching */
					break searchImage; // eslint-disable-line no-labels
				}
			}
		}
		catch (e) {
			console.error(this.getName() + '()', `[instantgram] ${program.VERSION}`, e);
		}
		/* =====  End of search image in feed  ======*/
	}
}