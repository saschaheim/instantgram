import { Program } from "../App";
import { Module, getErrorMessage, handleScanError } from "./Module";
import { MediaScanResult } from "../model/MediaScanResult";
import { WEB_PROFILE_INFO_ENABLED, fetchDataFromApi, getIGUsername, resolveProfileFromFeed, resolveProfileFromSearch } from "../helpers/instagramApi";
import { generateModalBodyHelper } from "../helpers/modalMedia";

type ProfilePictureInfo = {
    url: string;
    width?: number;
    height?: number;
};

/**
 * ProfileScanner is a module responsible for scanning profile pages on Instagram (or similar).
 * It extracts the username from the URL, fetches user data from an API, and generates modal data based on the profile.
 */
export class ProfileScanner implements Module {
    /**
     * Returns the name of the module.
     * @returns {string} The name of the module ("ProfileScanner").
     */
    public getName(): string {
        return "ProfileScanner";
    }

    private resolveProfilePictureInfo(...sources: Array<unknown>): ProfilePictureInfo | null {
        for (const source of sources) {
            if (!source || typeof source !== "object") {
                continue;
            }

            const candidate = source as {
                profile_pic_url_hd?: string;
                profile_pic_url?: string;
                hd_profile_pic_url_info?: { url?: string; width?: number; height?: number };
            };

            if (candidate.hd_profile_pic_url_info?.url) {
                return {
                    url: candidate.hd_profile_pic_url_info.url,
                    width: candidate.hd_profile_pic_url_info.width,
                    height: candidate.hd_profile_pic_url_info.height,
                };
            }

            const fallbackUrl = candidate.profile_pic_url_hd || candidate.profile_pic_url;
            if (fallbackUrl) {
                return { url: fallbackUrl };
            }
        }

        return null;
    }

    /**
     * Handles the process of fetching and processing data for a user profile.
     * This includes extracting the username from the URL, fetching user info, and generating modal data.
     * @param program The program object containing configuration or context for the module.
     * @returns {Promise<MediaScanResult | null>} The result of generating modal data or an error message.
     */
    private async handleProfilePage(program: Program): Promise<MediaScanResult | null> {
        // Extract Instagram username from the current URL
        const userName = getIGUsername(window.location.href);

        // If no username could be extracted, return an error
        if (!userName) {
            return { found: false, errorMessage: 'Invalid username extracted from URL' };
        }

        try {
            // web_profile_info is currently switched off (see
            // WEB_PROFILE_INFO_ENABLED); go straight to the feed and search
            // fallbacks, which resolve the same account id without it.
            const userInfo = WEB_PROFILE_INFO_ENABLED
                ? await fetchDataFromApi({ type: 'getUserInfoFromWebProfile', userName })
                : null;
            let userId = userInfo?.data?.user?.id;
            let feedOwner = null;
            let searchOwner = null;

            if (!userId) {
                const feedResult = await resolveProfileFromFeed(userName);
                userId = feedResult.userId ?? undefined;
                feedOwner = feedResult.owner;
            }

            if (!userId) {
                const searchResult = await resolveProfileFromSearch(userName);
                userId = searchResult.userId ?? undefined;
                searchOwner = searchResult.owner;
            }

            // If no user ID could be resolved through any path, return an error
            if (!userId) {
                return { found: false, errorMessage: 'No userID found in userInfo' };
            }

            // Fetch detailed user information using the user ID. /users/{id}/info/
            // comes back with no profile_pic_url* field at all for some
            // business/creator accounts, and completely empty
            // ({"user":{},"status":"ok"}, confirmed via a real captured
            // response) for private accounts, even once the id resolved
            // fine -- fall back to whichever of the feed/search lookups
            // above actually ran and still carries a profile_pic_url.
            const userDetails = await fetchDataFromApi({ type: 'getUserFromInfo', userId });
            const fallbackProfileInfo = this.resolveProfilePictureInfo(
                userDetails?.user,
                userInfo?.data?.user,
                userDetails?.data?.user,
                feedOwner,
                searchOwner
            );

            if (userDetails?.user && !userDetails.user.hd_profile_pic_url_info?.url && fallbackProfileInfo) {
                userDetails.user.hd_profile_pic_url_info = fallbackProfileInfo;
            }

            // If profile picture data is found, generate modal data and return it
            if (userDetails && userDetails.user?.hd_profile_pic_url_info?.url) {
                return await generateModalBodyHelper(null, userDetails, userName, window.location.href, program);
            } else if (fallbackProfileInfo) {
                return await generateModalBodyHelper(
                    null,
                    { user: { username: userName, hd_profile_pic_url_info: fallbackProfileInfo } },
                    userName,
                    window.location.href,
                    program
                );
            } else {
                return { found: false, errorMessage: 'Incomplete userDetails received' };
            }
        } catch (e) {
            return { found: false, userName, errorMessage: getErrorMessage(e), error: e };
        }
    }

    /**
     * Main execution method for scanning profile pages.
     * It checks if the current path matches the profile path regex and processes the profile page accordingly.
     * @param program The program object containing configuration or context for the module.
     * @returns {Promise<MediaScanResult | null>} The result of the profile page scan or an error message.
     */
    public async execute(program: Program): Promise<MediaScanResult | null> {
        // Check if the current path matches the profile path regex pattern
        if (!program.regexProfilePath.test(window.location.pathname)) {
            return { found: false, errorMessage: 'Path does not match profile path regex, exiting.' };
        }

        try {
            // Process the profile page and return the result
            const result = await this.handleProfilePage(program);

            // If no result is obtained, return an error message
            if (!result) {
                return { found: false, errorMessage: 'No result from handleProfilePage, returning null.' };
            }

            return result; // Return the profile scan result
        } catch (e) {
            return handleScanError(program, this.getName(), e);
        }
    }
}
