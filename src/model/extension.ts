import { ShortcodeMedia } from './post';

export interface ContentResponse {
    accountName: string;
    mediaURL: string[];
    original: ShortcodeMedia;
    timestamp: number;
}