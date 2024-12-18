/* eslint-disable no-unused-vars */
import { Program } from "../App";
import { MediaScanResult } from "../model/MediaScanResult";

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