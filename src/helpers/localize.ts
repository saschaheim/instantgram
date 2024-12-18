import { program } from ".."; // Importing the program object for logging and debugging
import localization from "../localization"; // Importing the localization data

// Get the user's language from the browser's navigator object
let shortLang = navigator.language;
// If the language includes a country code (e.g., "en-US"), extract just the language code ("en")
if (shortLang.indexOf("-") !== -1) {
    shortLang = shortLang.split("-")[0];
}
// If the language includes an underscore (e.g., "en_US"), extract just the language code ("en")
if (shortLang.indexOf("_") !== -1) {
    shortLang = shortLang.split("_")[0];
}

// Normalizing the language codes to match the available localization keys
const LANGS_NORMALIZE = {
    "de": "de-DE",
    "en": "en-US",
    "es": "es-AR",
    "pt": "pt-BR"
};

// Normalize the browser language to a supported format (if possible)
const LANG_DEFAULT = LANGS_NORMALIZE[shortLang];

/**
 * The `localize` function retrieves a localized string based on the key provided.
 * It returns the string in the appropriate language, falling back to the default language if the translation is not found.
 * 
 * @param str {string} [required] The key for the localized string (e.g., "modalSettingsTitle").
 * @param lang {string} [optional] The language to use for translation. Defaults to the browser language or a normalized default.
 * @returns {string} The localized string in the selected language.
 */
function localize(str: string, lang: string = LANG_DEFAULT): string {
    try {
        // Safe check to ensure the provided language exists in the localization object
        if (!Object.prototype.hasOwnProperty.call(localization.langs, lang)) {
            lang = "en-US"; // If the language is not found, fall back to English
        }

        // Check if the string key exists in the selected language's localization
        if (localization.langs[lang][str]) {
            return localization.langs[lang][str]; // Return the localized string
        }

        // Return an empty string if the string key is not found in the selected language
        return "";
    } catch (e) {
        // Log any errors encountered during localization and provide a detailed error message
        console.error(`[${program.NAME}]LOC error:`, e);
        return `ops, an error occurred in the localization system. Enter in https://github.com/saschaheim/${program.NAME}/issues/new and open an issue with this code: "LOC_dont_found_str_neither_default:[${lang}->${str}]" 
        for more information open the console`;
    }
}

// Log the default language setting to the console for debugging purposes
console.info(localize("helpers.localizeDefaultLang").replace("${LANG_DEFAULT}", LANG_DEFAULT));

// Export the localize function for use in other parts of the application
export default localize;