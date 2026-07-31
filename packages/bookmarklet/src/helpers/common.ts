import { Program } from "../App";

export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const resolveShouldMuteVideos = (program: Program): boolean =>
    window.location.pathname.startsWith("/stories/")
        ? program.settings.storiesMuted
        : program.settings.videosMuted;

export const normalizeVersionString = (version: string): string =>
    version.replace(/^v/i, "").trim().replace(/\./g, "-");

export const formatVersionLabel = (version: string): string =>
    "v"+normalizeVersionString(version).replace(/-/g, ".");

export const getBrowserInfo = (): { name: string; version: string } => {
    const ua = navigator.userAgent;
    const match = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(match[1] || "")) {
        return { name: "IE", version: /\brv[ :]+(\d+)/g.exec(ua)?.[1] || "" };
    }
    if (match[1] === "Chrome") {
        const variant = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (variant) return { name: variant[1].replace("OPR", "Opera"), version: variant[2] };
    }
    const version = ua.match(/version\/(\d+)/i);
    return match.length > 1
        ? { name: match[1], version: version?.[1] || match[2] }
        : { name: navigator.appName, version: navigator.appVersion };
};
