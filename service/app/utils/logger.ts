type LogLevel = "debug" | "info" | "warn" | "error";

interface LogData {
	message: string;
	[key: string]: unknown;
}

class Logger {
	private static instance: Logger;
	private environment: string;

	private constructor() {
		this.environment = process.env.NODE_ENV || "development";
	}

	public static getInstance(): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger();
		}
		return Logger.instance;
	}

	private formatLog(level: LogLevel, data: LogData): string {
		return JSON.stringify({
			timestamp: new Date().toISOString(),
			level,
			environment: this.environment,
			...data,
		});
	}

	debug(data: LogData): void {
		if (this.environment === "development") {
			console.log(this.formatLog("debug", data));
		}
	}

	info(data: LogData): void {
		console.log(this.formatLog("info", data));
	}

	warn(data: LogData): void {
		console.warn(this.formatLog("warn", data));
	}

	error(data: LogData): void {
		console.error(this.formatLog("error", data));
	}
}

export const logger = Logger.getInstance();
