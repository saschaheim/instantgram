import { Alert } from '../components/Alert';
import { ContentResponse } from '../model/extension';
import { GraphqlQuery, ShortcodeMedia } from '../model/post';
import { downloadZip } from 'client-zip';
//import * as JSZip from 'jszip';
import saveData from './saveData';

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
 * @param contentURL The post URL
 * @param index null for every media, -1 for the image in case of a GraphSidecar any other index for the index of the GraphSidecar
 */
export async function getMedia(contentURL: string, index: number | null = null): Promise<ContentResponse> {
    const response = await makeRequest(contentURL);

    return {
        mediaURL: extractImage(response, index),
        accountName: extractAccountName(response),
        timestamp: extractTakenTimestamp(response),
        original: response
    };
}

/**
 * Make a request to the instagram API and return the result
 * @param contentURL The api url to query
 */
export const makeRequest = LogIGRequest(async (contentURL: string): Promise<ShortcodeMedia> =>
    (await (await fetch(`${contentURL}?__a=1`)).json() as GraphqlQuery).graphql.shortcode_media);

/**
 * Extract the account name of an API response
 */
export function extractAccountName(shortcodeMedia: ShortcodeMedia): string {
    return shortcodeMedia.owner.username;
}

export function extractImage(shortcodeMedia: ShortcodeMedia, index: number | null = null): string[] {
    let mediaURL: string[];
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

    return mediaURL;
}

export function extractTakenTimestamp(shortcodeMedia: ShortcodeMedia): number {
    return shortcodeMedia.taken_at_timestamp;
}

export interface ZippedFile {
    name: string
    lastModified: Date
    input: string | Blob
}

export async function downloadBulk(urls: string[], accountName: string, callback?: any): Promise<boolean> {
    //let zip;
    //const zip: JSZip = new JSZip();
    let files: ZippedFile[] = [];

    let error: boolean = false;

    // urls.forEach(function (item, index) {
    //     (item as unknown as Array<string>).forEach(function (_item, index) {
    //         console.log(_item);
    //         if (typeof _item === "number") {

    //         } else {

    //         }
    //     })
    // });

    let createdTimestamp = null;
    let imageIndex = null;
    let url = null;

    for (var i = 0, l1 = urls.length; i < l1; i++) {
        // This loop is for inner-array
        for (var j = 0, l2 = urls[i].length; j < l2; j++) {
            // Accessing each elements of inner-array
            if (typeof urls[i][j] === "string") {
                imageIndex = j;
                createdTimestamp = urls[i][urls[i].length - 1];
                url = urls[i][j];
            } else {
                break;
            }

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
            }).catch(function (err) {
                console.warn('Cannot fetch a media url');
            })

            // If cannot fetch, warn
            if (response) {
                error = false;
                files.push({
                    name: getImageId(url),
                    lastModified: new Date(createdTimestamp * 1000),
                    input: await response.blob()
                });
            } else {
                error = true;
            }

            callback({
                percent: Number((imageIndex + 1 / urls[i].length).toFixed(2)),
                isFirst: imageIndex === 0,
                isLast: imageIndex + 1 === urls[i].length,
                type: 'download',
                error: error
            });
        }
    }

    if (!error) {
        console.log(files);
        await _downloadZIP(files, accountName);
    }

    return error;
}

/**
 * Download the zip file
 * @param zip The JSZip file which should be downloaded
 * @param accountName The account name
 */
export async function _downloadZIP(files: ZippedFile[], accountName: string, callback?: any): Promise<void> {
    const archive = downloadZip(files)
    const blob = await archive.blob()

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