export interface LogLevelFlags {
	err   : boolean,
	warn  : boolean,
	info  : boolean,
	debug : boolean
}

export class Logger
{
	private levels: LogLevelFlags;
	private filename: string;

	public static MakeWithLevels(levels: LogLevelFlags, filename: string)
	{
		return new Logger(levels, filename);
	}

	public static Make(level: 'none'|'err'|'warn'|'info'|'debug', filename: string)
	{
		const levels: LogLevelFlags = {
			err   : level == 'debug' || level == 'info' || level == 'warn' || level == 'err',
			warn  : level == 'debug' || level == 'info' || level == 'warn',
			info  : level == 'debug' || level == 'info',
			debug : level == 'debug'
		}

		return new Logger(levels, filename);
	}

	private constructor(levels: LogLevelFlags, filename: string) {
		this.levels = levels;
		this.filename = filename;
	}

	public err(msg: string) {
		if (this.levels.err) {
			console.log(`[${this.filename}] ERR: ${msg}`);
		}
	}

	public warn(msg: string) {
		if (this.levels.warn) {
			console.log(`[${this.filename}] WARN: ${msg}`);
		}
	}

	public info(msg: string) {
		if (this.levels.info) {
			console.log(`[${this.filename}] INFO: ${msg}`);
		}
	}

	public debug(msg: string) {
		if (this.levels.info) {
			console.log(`[${this.filename}] DEBUG: ${msg}`);
		}
	}

	public always(msg: string) {
		console.log(`[${this.filename}]: ${msg}`);
	}
}
