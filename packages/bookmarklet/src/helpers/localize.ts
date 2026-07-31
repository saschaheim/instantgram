import { buildLocale, embeddedLocales, localizations, LocalizationKey } from "../localization";
import { findAppId, mediaInfoUrlPrefix, secureFetch, shortcodeToMediaId } from "./instagramApi";

export const localeStorageKey = "instantgram_locale";
export const localeUnavailableMessage = "[instantgram] Additional languages are only available on instagram.com";
export const supportedLocales = ["en-US", "de-DE", "es-AR", "pt-BR"] as const;
export type SupportedLocale = typeof supportedLocales[number];
export const isInstagramHost = (): boolean => location.hostname.includes("instagram.com");
const localeCachePrefix = "instantgram_i18n_";
const cannotLoadPrefix = "[instantgram] Cannot load ";
const localeListeners = new Set<() => void>();
const remoteLocalePosts: Partial<Record<SupportedLocale, string>> = {
    "de-DE": "DbYMOJYNH40",
    "es-AR": "DbYODSVN2fg",
    "pt-BR": "DbYOEu4NFQn",
};

const getDictionary = (locale: SupportedLocale) => {
    if (localizations[locale]) return localizations[locale];
    try {
        const cached = JSON.parse(localStorage.getItem(localeCachePrefix + locale) || "null");
        if (cached) localizations[locale] = cached;
    } catch {
        localStorage.removeItem(localeCachePrefix + locale);
    }
    return localizations[locale];
};

export const getLocale = (): SupportedLocale => {
    if (!embeddedLocales && !isInstagramHost()) return "en-US";
    const storedLocale = localStorage.getItem(localeStorageKey);
    if (supportedLocales.includes(storedLocale as SupportedLocale)) {
        return storedLocale as SupportedLocale;
    }
    const browserLocale = (navigator.languages?.[0] || navigator.language || buildLocale).toLowerCase();
    if (browserLocale.startsWith("de")) return "de-DE";
    if (browserLocale.startsWith("es")) return "es-AR";
    if (browserLocale.startsWith("pt")) return "pt-BR";
    return "en-US";
};

export const setLocale = (locale: SupportedLocale): void => {
    localStorage.setItem(localeStorageKey, locale);
    localeListeners.forEach(listener => listener());
};

export const subscribeLocale = (listener: () => void): (() => void) => {
    localeListeners.add(listener);
    return () => localeListeners.delete(listener);
};

export const loadLocale = async (locale: SupportedLocale): Promise<boolean> => {
    if (getDictionary(locale)) return true;
    if (!isInstagramHost()) {
        console.info(localeUnavailableMessage);
        return false;
    }
    const shortcode = remoteLocalePosts[locale];
    const appId = findAppId();
    const mediaId = shortcode && shortcodeToMediaId(shortcode);
    if (!appId || !mediaId) {
        console.error(cannotLoadPrefix+locale+": missing app ID or media ID");
        return false;
    }
    const caption = (await secureFetch(mediaInfoUrlPrefix+mediaId+"/info/", appId))
        ?.items?.[0]?.caption?.text;
    const prefix = "i18n:"+locale+"::";
    const prefixIndex = caption?.indexOf(prefix) ?? -1;
    if (prefixIndex < 0) {
        console.error(cannotLoadPrefix+locale+": caption or language prefix missing");
        return false;
    }
    try {
        const payload = caption!.slice(prefixIndex + prefix.length);
        const dictionary = JSON.parse(payload.slice(0, payload.lastIndexOf("}") + 1));
        localizations[locale] = dictionary;
        localStorage.setItem(localeCachePrefix + locale, JSON.stringify(dictionary));
        return true;
    } catch (error) {
        console.error(cannotLoadPrefix+locale+": invalid translation JSON", error);
        return false;
    }
};

function localize(str: string): string {
    return (getDictionary(getLocale()) || localizations["en-US"])?.[str as LocalizationKey] || "";
}

export default localize;
