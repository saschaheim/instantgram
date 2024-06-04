import { Program } from "../App"
import { MediaScanResult } from "../model/MediaScanResult"

export abstract class Module {
	public abstract getName(): string
	public abstract execute(program: Program): Promise<MediaScanResult | void | null>
}