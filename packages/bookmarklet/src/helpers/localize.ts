import { program } from "..";
import localization from "../localization";

function localize(str: string): string {
    try {
        return localization[str as keyof typeof localization] || "";
    } catch (e) {
        console.error(`[${program.NAME}]LOC error:`, e);
        return `ops, an error occurred in the localization system. Enter in https://github.com/saschaheim/${program.NAME}/issues/new and open an issue with this code: "LOC_dont_found_str:[${str}]" 
        for more information open the console`;
    }
}

export default localize;
