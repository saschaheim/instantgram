import { PostItem, ShortcodeMedia } from './post';

export interface ContentResponse {
    accountName: string;
    mediaURL: string[];
    originalResponse: PostItem | ShortcodeMedia;
    timestamp: number;
}