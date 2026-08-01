import { bundledLocalizations } from "./localization.bundled";

const locale = process.env.LOCALE || "en-US";
export const embeddedLocales = process.env.EMBED_LOCALES as unknown as boolean;

const enUS = {
    "h.ld": "[instantgram] Language: en-US\nFor more information about available languages, visit https://saschaheim.github.io/instantgram",
    "a.wo": "Only works on instagram.com",
    "a.nf": "Did you open an Instagram post? For example:",
    "a.ie": "This media isn't supported yet.",
    "ms.t": "Settings",
    "ms.g": "General",
    "sup": "Support instantgram",
    "msg.t2": "Download in a new tab",
    "msg.d2": "The download opens in a new tab",
    "msg.t3": "Slideshow on/off",
    "msg.d3": "Enable or disable the automatic slideshow",
    "msg.t4": "Change filename format",
    "msg.d4": "Change the filename format for downloads here.\nThe default format is:\n{Username}__{Year}-{Month}-{Day}--{Hour}-{Minute}",
    "msg.t5": "Mute videos",
    "msg.d5": "Post, feed and reel videos are muted when opened",
    "msg.t6": "Auto-expand",
    "msg.d6": "Automatically expands the media window after opening",
    "mss.t1": "Mute",
    "mss.d1": "Stories are muted when opened",
    "mss.t2": "Pause on open",
    "mss.d2": "Stories are paused when opened",
    "mss.t3": "Display individually",
    "mss.d3": "Stories are displayed individually when opened",
    "d": "Download",
    "l": "Searching for media...",
    "s": "Save",
    "sd": "Saved",
    "c": "Close",
    "u.t": "Update available",
    "u.i": "[instantgram] is outdated. Please check https://saschaheim.github.io/instantgram for available updates.",
    "u.v": "[instantgram] Installed version: %version% | New update: %onlineVersion%",
    "modules.update@update_successful": "[instantgram] Update check successful.",
    "ad": "Sponsored"
} as const;

export type LocalizationKey = keyof typeof enUS;
type LocalizationDictionary = Record<LocalizationKey, string>;

export const localizations: Partial<Record<string, LocalizationDictionary>> = {
    "en-US": enUS,
    ...(embeddedLocales ? bundledLocalizations as Record<string, LocalizationDictionary> : {}),
};

export const buildLocale = locale;
