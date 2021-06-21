import { Program } from '../App';

export abstract class Module {
	public abstract getName(): string;
	public abstract execute(program: Program, callback?: any): Promise<any>;
}