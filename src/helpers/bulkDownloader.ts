import { Alert } from '../components/Alert';
import { ContentResponse } from '../model/extension';
import { GraphqlQuery, PostItem, PostQuery, ShortcodeMedia } from '../model/post';
import { downloadZip } from 'client-zip';
import saveData from './saveData';

const isShortcodeMedia = (media: ShortcodeMedia | PostItem): media is ShortcodeMedia => '__typename' in media;

// tslint:disable-next-line:ban-types
export function LogIGRequest<T extends Function>(method: T): T {
    return ((...args: any[]) => {
        try {
            return method(...args);
        } catch (e) {
            Alert.add('Looks like Instagram has figured out you are using a downloader. <br>The download may not work for the next time');
            throw e;
        }
    }) as unknown as T;
}

/**
 * Get the media file links for a post
 * @param postURL The post URL
 * @param index null for every media, -1 for the image in case of a GraphSidecar any other index for the index of the GraphSidecar
 */
export async function getMedia(postURL: string, index: number | null = null): Promise<ContentResponse> {
    const response = await makeRequest(postURL);

    return {
        mediaURL: extractImage(response, index),
        accountName: extractAccountName(response),
        timestamp: extractTakenTimestamp(response),
        originalResponse: response,
    };
}

/**
 * Make a request to the instagram API and return the result
 * @param postURL The api url to query
 */
export const makeRequest = LogIGRequest(async (postURL: string): Promise<PostItem | ShortcodeMedia> => {
    const response = await (await fetch(`${postURL}?__a=1`)).json() as PostQuery | GraphqlQuery;
    if ('graphql' in response && response.graphql) {
        return response.graphql.shortcode_media;
    }

    return (response as PostQuery).items[0];
});

/**
 * Extract the account name of an API response
 */
export function extractAccountName(shortcodeMedia: ShortcodeMedia | PostItem): string {
    const user = isShortcodeMedia(shortcodeMedia) ? shortcodeMedia.owner: shortcodeMedia.user

    return user.username;
}

export function extractImage(shortcodeMedia: ShortcodeMedia | PostItem, index: number | null = null): string[] {
    let mediaURL: string[];

    if (isShortcodeMedia(shortcodeMedia)) {
        if (shortcodeMedia.__typename === 'GraphImage') {
            mediaURL = [shortcodeMedia.display_url];
        } else if (shortcodeMedia.__typename === 'GraphVideo') {
            mediaURL = [shortcodeMedia.video_url];
        } else if (index === -1) {
            mediaURL = [shortcodeMedia.display_url];
        } else if (index === null) {
            mediaURL = [];
            for (const i of Array(shortcodeMedia.edge_sidecar_to_children.edges.length).keys()) {
                mediaURL.push(
                    extractImage(shortcodeMedia, i)[0],
                );
            }
        } else {
            mediaURL = extractImage(shortcodeMedia.edge_sidecar_to_children.edges[index].node as ShortcodeMedia);
        }
    } else {
        const imageIndex = index === -1 ? 0 : index;
        if (shortcodeMedia.video_versions) {
            // Post is a video
            mediaURL = [shortcodeMedia.video_versions[0].url];
        } else if (shortcodeMedia.image_versions2) {
            // Post is an image
            mediaURL = [shortcodeMedia.image_versions2.candidates[0].url];
        } else {
            // Multiple posts are present and optionally uses an index
            const urls = shortcodeMedia.carousel_media!.map(media => {
                const mediaObject = media.video_versions ? media.video_versions[0] : media.image_versions2.candidates[0];

                return mediaObject.url;
            });
            mediaURL = imageIndex != null ? [urls[imageIndex]] : urls;
        }
    }

    return mediaURL;
}

export function extractTakenTimestamp(shortcodeMedia: ShortcodeMedia | PostItem): number {
	if(isShortcodeMedia(shortcodeMedia)) {
		return shortcodeMedia.taken_at_timestamp;
	} else {
		return 0;
	}
}

export interface ZippedFile {
    name: string
    lastModified: Date
    input: string | Blob
    fetchResponse: Response
}

export async function downloadBulk(urls: string[], accountName: string, callback?: any): Promise<boolean> {
    let files: ZippedFile[] = [];
    let error: boolean = false;

    // Used for precise download progress calculation
    let urlsWithoutTimestamp = [].concat.apply([], urls).flatMap(val => {
        return typeof val == "number" ? [] : [val];
    });

    let urlsOnlyTimestamp = [];
    for (let i = 0; i < urls.length; i++) {
        // This loop is for inner-array
        for (var j = 0, l2 = urls[i].length; j < l2; j++) {
            // Accessing each elements of inner-array
            if (typeof urls[i][j] === "string" && typeof urls[i][j] !== "number") {
                urlsOnlyTimestamp.push(urls[i][urls[i].length - 1]);
            }
        }
    }
    // Flaten timestamp array
    urlsOnlyTimestamp = [].concat.apply([], urlsOnlyTimestamp);

    let timeStarted: string = new Date().toISOString();

    for (const [imageIndex, url] of urlsWithoutTimestamp.entries()) {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'curl/7.64.1',
            }
        }).then(function (response) {
            if (response.ok) {
                return response;
            } else {
                return Promise.reject(response);
            }
        }).catch(function () {
            console.warn('Cannot fetch a media url');
        })

        // If cannot fetch, warn
        if (response) {
            error = false;

            files.push({
                name: getImageId(url),
                lastModified: new Date(urlsOnlyTimestamp[imageIndex] * 1000),
                input: await response.blob(),
                fetchResponse: response
            });
        } else {
            error = true;
        }

        callback({
            percent: Number((Math.round(((imageIndex + 1) / urlsWithoutTimestamp.length) * 100)).toFixed(2)),
            isFirst: imageIndex === 0,
            isLast: imageIndex + 1 === urlsWithoutTimestamp.length,
            type: 'download',
            currentMediaPos: imageIndex + 1,
            totalMediaFiles: urlsWithoutTimestamp.length,
            started: timeStarted,
            error: error
        });
    }

    if (!error) {
        await _downloadZIP(files, accountName, callback);
    }

    return error;
}

/**
 * Download the zip file
 * @param zip The JSZip file which should be downloaded
 * @param accountName The account name
 */
export async function _downloadZIP(files: ZippedFile[], accountName: string, callback?: any): Promise<void> {
    let isFirst = true;
    // Calculate total download size by summing up the HTTP header `Content-Length` + the length
    // of the UTF-8 encoded file name + 92 Bytes
    let totalBytes = 0;
    files.forEach(file => {
        const contentLength = +file.fetchResponse.headers.get('Content-Length');
        const fileNameSizeInBytes = (new TextEncoder().encode(file.name)).length;
        totalBytes += contentLength + fileNameSizeInBytes + 92;
    });
    totalBytes += 22;

    const response = downloadZip(files);
    const reader = response.body.getReader();

    let receivedBytes = 0;
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            isFirst = false;
            break;
        }

        chunks.push(value);
        receivedBytes += value.length;

        //console.log(`Received ${receivedBytes} of ${totalBytes} Bytes -> ${(receivedBytes / totalBytes * 100).toFixed()} %`);

        callback({
            percent: Number((receivedBytes / totalBytes * 100).toFixed()),
            isFirst,
            isLast: (receivedBytes / totalBytes * 100) === 100,
            type: 'compression',
            error: false
        });
    }

    //console.log(['isFirst', isFirst]);
    //console.log(['isLast', (receivedBytes / totalBytes * 100) === 100]);

    const blob = new Blob(chunks);

    if (accountName) {
        saveData(blob, `${accountName}.zip`);
    } else {
        saveData(blob, 'bulk_download.zip');
    }
}

/**
 * Gets the image name based on the url of the image
 * @param url the url of the image or video
 * @returns the image/video name
 */
function getImageId(url: string): string {
    // tslint:disable-next-line:no-non-null-assertion
    return url.split('?')[0]!.split('/').pop()!;
}