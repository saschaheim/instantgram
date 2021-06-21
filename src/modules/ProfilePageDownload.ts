import { Program } from '../App';
import { Module } from './Module';
import { Modal } from '../components/Modal';
import localize from '../helpers/localize';
import sleep from '../helpers/sleep';
import validURL from '../helpers/validURL';
import { downloadBulk, getMedia } from '../helpers/bulkDownloader';

export class ProfilePageDownload implements Module {

	private program: Program

	private modal: Modal = new Modal();
	private continueImageLoading: boolean = true;

	private readonly downloadIndicator: HTMLParagraphElement;
	private resolvedContent: number = 0;

	private inProgress = false;

	public constructor() {
		this.downloadIndicator = document.createElement('p');
		this.downloadIndicator.id = 'instantgram-bulk-download-indicator';
		this.downloadIndicator.setAttribute('style', 'color:green;');
	}

	public getName(): string {
		return 'ProfilePageDownload';
	}

	private atBottom(): boolean {
		const offset = window.pageYOffset;
		const windowHeight = window.innerHeight;
		const pageHeight = document.body.scrollHeight;

		return (offset + windowHeight + 100) > pageHeight;
	}

	/**
	 * 
	 * 1. collectImageLinks() -> collectPostLinks
	 * 2. collectMedia() -> 
	 */

	/**
	 * Collect all images of an account by scrolling down
	 */
	private async collectImageLinks(downloadSpeed: number): Promise<Set<string>> {

		// Show the modal which allows the user to stop the collection process
		this.showStopCollectingModal();

		// Create a new set
		const postLinkSet: Set<string> = new Set<string>();
		this.continueImageLoading = true;

		let loadingIndicator: boolean;
		let interruptClass: boolean;

		// Scroll down and collect images as long as possible
		// Reset scroll
		document.body.scrollTop = 0;
		document.documentElement.scrollTop = 0;

		do {
			this.collectPostLinks(postLinkSet);

			// Scroll down
			scrollBy(0, window.innerHeight);
			await sleep(3 / (downloadSpeed * 2000));

			// Show the collected image number
			this.downloadIndicator.innerText = `${localize('index#program#profilePageDownload@str_analyzed_from_to').replace('${data.size}', String(postLinkSet.size))}`;

			// Check for classes which indicate the end of the image loading
			loadingIndicator = document.querySelectorAll('.By4nA').length > 0;
			interruptClass = document.querySelectorAll('._0mzm-.sqdOP.yWX7d').length === 0;
		} while (this.continueImageLoading && loadingIndicator && interruptClass || !this.atBottom() && this.continueImageLoading);

		this.collectPostLinks(postLinkSet);

		if (process.env.DEV) {
			console.log(['Collected bulk links:', postLinkSet]);
		}

		return postLinkSet;
	}

	private showStopCollectingModal(): void {
		this.modal.heading = [
			`<h5>[instantgram] <span>${localize('index#program#profilePageDownload@stop_collecting_modal_title')}</span><span style="float:right">v${this.program.VERSION}</span></h5>`
		];
		this.modal.content = [
			localize('index#program#profilePageDownload@stop_collecting_modal_content_1'),
			localize('index#program#profilePageDownload@stop_collecting_modal_content_2'),
			this.downloadIndicator
		];
		this.modal.contentStyle = 'text-align:center';
		this.modal.buttonList = [{
			text: localize('index#program#profilePageDownload@stop_collecting_modal_btn'),
			active: true,
			callback: () => {
				this.continueImageLoading = false
			}
		}];
		this.modal.open();
	}

	/**
	 * Collect the links from the posts
	 * @param postLinkSet A set of post links
	 */
	private collectPostLinks(postLinkSet: Set<string>): void {
		// Get all images which are displayed
		const images = Array.from(document.querySelectorAll('._bz0w, .pKKVh, .Tjpra > a')) as HTMLElement[];
		images.forEach((imageElement) => {
			// Add the image links to the images

			// @ts-ignore
			const downloadLink = 'href' in imageElement ? imageElement.href : imageElement.firstChild?.href;
			if (validURL(downloadLink)) {
				postLinkSet.add(downloadLink);
			}
		});
	}

	/**
	 * Display the collect image modal
	 */
	private async collectMedia(postLinks: Set<string>): Promise<string[]> {
		await sleep(3000);

		this.modal.heading = [
			`<h5>[instantgram] <span>${localize('index#program#profilePageDownload@collect_media_modal_title')}</span><span style="float:right">v${this.program.VERSION}</span></h5>`
		];
		this.modal.content = [
			localize('index#program#profilePageDownload@collect_media_modal_content'),
			this.downloadIndicator
		];
		this.modal.contentStyle = 'text-align:center';
		this.modal.buttonList = [{
			active: true,
			callback: () => this.resolvedContent = Number.MAX_VALUE,
			text: localize('index#program#profilePageDownload@collect_media_modal_btn')
		}];
		await this.modal.open();

		this.downloadIndicator.innerText = localize('index#program#profilePageDownload@collect_media_modal_content_download_indicator').replace('${this.resolvedContent}', String(this.resolvedContent)).replace('${postLinks.size}', String(postLinks.size));

		return this.collectDownloadLinks(postLinks);
	}

	/**
	 * Make api calls to get the images
	 * @param postLinks All the image links on the page
	 */
	private async collectDownloadLinks(postLinks: Set<string>): Promise<any[]> {
		this.resolvedContent = 0;

		const mediaList: any[] = [];
		for (const link of postLinks) {
			const response = await getMedia(link);
			await sleep(2500);
			//mediaList.push(...response.mediaURL);
			mediaList.push([
				...response.mediaURL,
				response.timestamp
			]);
			this.resolvedContent += 1;
			this.downloadIndicator.innerText = localize('index#program#profilePageDownload@collect_media_modal_content_download_indicator').replace('${this.resolvedContent}', String(this.resolvedContent)).replace('${postLinks.size}', String(postLinks.size));
			if (this.resolvedContent >= postLinks.size) {
				break;
			}
		}
		await this.modal.close();

		return mediaList;
	}

	/**
	 * Display the end of download modal
	 */
	private displayEndModal(): void {
		this.downloadIndicator.innerText = '';

		this.modal.heading = [
			`<h5>[instantgram] <span>${localize('index#program#profilePageDownload@collection_complete_modal_title')}</span><span style="float:right">v${this.program.VERSION}</span></h5>`
		];
		this.modal.content = [
			localize('index#program#profilePageDownload@collection_complete_modal_content_1'),
			localize('index#program#profilePageDownload@collection_complete_modal_content_2'),
			this.downloadIndicator
		];
		this.modal.contentStyle = 'text-align:center';
		this.modal.buttonList = [{
			active: true,
			callback: () => {
				document.getElementById('instantgram-bulk-downloader').remove()
				document.getElementById('instantgram-bulk-downloader-download').remove()
				this.modal.close()
			},
			text: localize('index#program#profilePageDownload@collection_complete_modal_btn')
		}];
		this.modal.open();
	}

	/**
	 * Get the account name of a post
	 * @param element The post element
	 * @param accountClass The class the account has
	 */
	protected getAccountName(element: HTMLElement, accountClass: string): string {
		let accountName: string;

		try {
			accountName = (element.querySelector(accountClass) as HTMLElement).innerText;
		} catch {
			accountName = 'no_account_found';
		}

		return accountName;
	}

	private updateProgress(metadata: any) {
		// Add the message button
		if (metadata.isFirst) {
			this.inProgress = true;
		}

		const text = `${metadata.type === 'download' ? 'Downloading' : 'Compression'} progress at ${metadata.percent}%`;

		// Remove the message button and set the progress to false
		if (metadata.isLast) {
			this.inProgress = false;
			this.downloadIndicator.innerText = text;
		}

		if (metadata.error) {
			this.downloadIndicator.setAttribute('style', 'color:red;');
			this.downloadIndicator.innerText = 'Download failed';
		}

		// Prevent async messages which arrive after the last message to change the number
		if (this.inProgress) {
			this.downloadIndicator.textContent = text;

			if (metadata.error) {
				this.downloadIndicator.setAttribute('style', 'color:red;');
				this.downloadIndicator.innerText = 'Download failed';
			}
		}
	}

	public async execute(program: Program, callback: any): Promise<any> {
		/* =====================================
		 =   End of collect media in profile   =
		 ==================================== */
		try {
			// Reference program
			this.program = program;

			// Check temporary indicator to prevent multiple calls
			let existsElement = document.getElementById('instantgram-bulk-downloader');
			if (existsElement) {
				existsElement.parentNode.removeChild(existsElement);
			} else {
				// Add temporary indicator to prevent multiple calls
				let createExistsElement = document.createElement('div');
				createExistsElement.id = 'instantgram-bulk-downloader';
				document.body.appendChild(createExistsElement);
			}

			// Get all links of content posts
			const postLinks: Set<string> = await this.collectImageLinks(parseInt('1', 0) % 3);

			// Collect the media files of the posts
			const mediaLinks: any[] = await this.collectMedia(postLinks);

			console.log(mediaLinks);

			this.displayEndModal();

			let error = await downloadBulk(mediaLinks, this.getAccountName(document.body, '._7UhW9.fKFbl.yUEEX.KV-D4.fDxYl'), async (metadata) => {
				this.updateProgress(metadata);
			});

			document.getElementById('instantgram-bulk-downloader').remove();
			document.getElementById('instantgram-bulk-downloader-download').remove();
			this.modal.close();

			if (error) {
				callback(false, program);
			} else {
				callback(true, program);
			}
		}
		catch (e) {
			console.error(this.getName() + '()', `[instantgram] ${program.VERSION}`, e);
		}
		/* =====  End of collect media in profile  ======*/
	}
}