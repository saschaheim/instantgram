import { Program } from "../App"
import { Module } from "./Module"
import { MediaScanResult } from "../model/MediaScanResult"
import { fetchDataFromApi, generateModalBodyHelper, getIGUsername } from "../helpers/utils"

export class ProfileScanner implements Module {
    public getName(): string {
        return "ProfileScanner"
    }

    private async handleProfilePage(program: Program): Promise<MediaScanResult | null> {
        const userName = getIGUsername(window.location.href)
        if (!userName) {
            return { found: false, errorMessage: 'Invalid username extracted from URL' }
        }

        try {
            const userInfo = await fetchDataFromApi({ type: 'getUserInfoFromWebProfile', userName })
            if (!userInfo.data.user.id) {
                return { found: false, errorMessage: 'No userID found in userInfo' }
            }
            const userId = userInfo.data.user.id
            const userDetails = await fetchDataFromApi({ type: 'getUserFromInfo', userId })
            if (userDetails && userDetails.user?.hd_profile_pic_url_info?.url) {
                return await generateModalBodyHelper(null, userDetails, userName, window.location.href, program)
            } else {
                return { found: false, errorMessage: 'Incomplete userDetails received' }
            }
        } catch (e) {
            return { found: false, userName, errorMessage: e.message, error: e }
        }
    }

    public async execute(program: Program): Promise<MediaScanResult | null> {
        if (!program.regexProfilePath.test(window.location.pathname)) {
            return { found: false, errorMessage: 'Path does not match profile path regex, exiting.' }
        }

        try {
            const result = await this.handleProfilePage(program)
            if (!result) {
                return { found: false, errorMessage: 'No result from handleProfilePage, returning null.' }
            }

            return result
        } catch (e) {
            console.error(`[${program.NAME}] ${program.VERSION}`, this.getName() + "()", e)
            return { found: false, errorMessage: e.message, error: e }
        }
    }
}