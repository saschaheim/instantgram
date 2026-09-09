import { Program } from "../App";
import { Module, getErrorMessage, handleScanError } from "./Module";
import { MediaScanResult } from "../model/MediaScanResult";
import {
    fetchDataFromApi,
    fetchGraphqlOwner,
    fetchWebProfileOwner,
    getIGUsername,
    resolveProfile
} from "../helpers/instagramApi";
import { generateModalBodyHelper, resolveProfilePictureInfo } from "../helpers/modalMedia";

const FIREFOX_LITE = process.env.FIREFOX_LITE as unknown as boolean ?? false;

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
            return { found: false };
        }

        try {
            // The account id comes from the feed/search lookups, never from
            // web_profile_info -- that endpoint is per-account gated and fails
            // outright for many profiles (issue #45).
            const profile = await resolveProfile(userName);
            const userId = profile.userId;

            // If no user ID could be resolved through any path, return an error
            if (!userId) {
                return { found: false };
            }

            // Every source that can carry a profile picture, queried at once:
            // no single one is reliable. /users/{id}/info/ comes back with no
            // profile_pic_url* field at all for some business/creator accounts
            // and completely empty ({"user":{},"status":"ok"}) for private
            // ones; the graphql query is the only source with the full-size
            // original but depends on page tokens and a pinned doc_id;
            // web_profile_info tops out at 320 and feed/search at 150.
            const [userDetails, graphqlOwner, webProfileOwner] = await Promise.all([
                fetchDataFromApi({ type: 'getUserFromInfo', userId }),
                ...(!FIREFOX_LITE ? [fetchGraphqlOwner(userId), fetchWebProfileOwner(userName)] : []),
            ]);
            const bestProfileInfo = resolveProfilePictureInfo(
                graphqlOwner,
                userDetails?.user,
                userDetails?.data?.user,
                webProfileOwner,
                profile.owner
            );

            // Overwrite unconditionally -- resolveProfilePictureInfo already
            // compared every source, and /users/{id}/info/'s own
            // hd_profile_pic_url_info is only 150px for some accounts.
            if (userDetails?.user && bestProfileInfo) {
                userDetails.user.hd_profile_pic_url_info = bestProfileInfo;
            }

            // If profile picture data is found, generate modal data and return it
            if (userDetails && userDetails.user?.hd_profile_pic_url_info?.url) {
                return await generateModalBodyHelper(null, userDetails, userName, window.location.href, program);
            } else if (bestProfileInfo) {
                return await generateModalBodyHelper(
                    null,
                    { user: { username: userName, hd_profile_pic_url_info: bestProfileInfo } },
                    userName,
                    window.location.href,
                    program
                );
            } else {
                return { found: false };
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
            return { found: false };
        }

        try {
            // Process the profile page and return the result
            const result = await this.handleProfilePage(program);

            // If no result is obtained, return an error message
            if (!result) {
                return { found: false };
            }

            return result; // Return the profile scan result
        } catch (e) {
            return handleScanError(program, this.getName(), e);
        }
    }
}
