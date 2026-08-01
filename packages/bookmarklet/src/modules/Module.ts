import { Program } from "../App";
import { MediaScanResult } from "../model/MediaScanResult";
import { generateModalBody } from "../helpers/modalMedia";

/**
 * Shared errorMessage used by every scanner when it can't locate any
 * post/story/profile structure on the page at all. MediaScanner's
 * buildNotFoundBody() checks for this exact value to distinguish "wrong
 * page" from "found a target but Instagram's API failed".
 */
export const NO_TARGET_FOUND = "No target found.";

export const getErrorMessage = (e: unknown): string => e instanceof Error ? e.message : String(e);

/**
 * Shared catch-block handler for a scanner's execute(): logs the error with
 * the module name and returns the found:false result shape every scanner
 * uses for unexpected exceptions.
 */
export const handleScanError = (program: Program, moduleName: string, e: unknown): MediaScanResult => {
    console.error("["+program.NAME+"] "+program.VERSION, moduleName + "()", e);
    return { found: false, errorMessage: getErrorMessage(e), error: e };
};

/**
 * Shared execute() body for scanners whose only unique behavior is finding a
 * single target element -- FeedScanner, PostAndReelScanner, ReelsScanner.
 * StoriesScanner and ProfileScanner have genuinely different control flow
 * (async fetches, highlights/feed branching) and stay bespoke.
 */
export const runSimpleScan = async (
    program: Program,
    moduleName: string,
    findElement: () => HTMLElement | null
): Promise<MediaScanResult | null> => {
    try {
        const element = findElement();
        if (!element) {
            return { found: false, errorMessage: NO_TARGET_FOUND };
        }
        return await generateModalBody(element, program);
    } catch (e) {
        return handleScanError(program, moduleName, e);
    }
};

/**
 * The Module class serves as an abstract class for all modules in the application.
 * Each module must implement the `getName` and `execute` methods.
 * This allows different modules to be plugged into the system with consistent behavior.
 */
export abstract class Module {
    /**
     * Abstract method that returns the name of the module.
     * This should be implemented by each specific module to return its unique name.
     * @returns {string} The name of the module.
     */
    public abstract getName(): string;

    /**
     * Abstract method that executes the module's functionality.
     * The method will be implemented by each specific module to perform its work.
     * @param program The program object containing configuration or context for the module.
     * @returns {Promise<MediaScanResult | void | null>} The result of the execution, or void/null if no result is produced.
     */
    public abstract execute(program: Program): Promise<MediaScanResult | void | null>;
}
