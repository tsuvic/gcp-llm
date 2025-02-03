import winston from "winston";

const logger = winston.createLogger({
	level: process.env.NODE_ENV === "development" ? "debug" : "info",
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.errors({ stack: true }),
		winston.format.json(),
	),
	defaultMeta: {
		service: "articleplay",
		environment: process.env.NODE_ENV || "development",
	},
	transports: [
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.printf(({ level, message, timestamp, ...meta }) => {
					const metaString = Object.keys(meta).length
						? `\n${JSON.stringify(meta, null, 2)}`
						: "";
					return `${timestamp} ${level}: ${message}${metaString}`;
				}),
			),
		}),
	],
});

// 開発環境の場合はより詳細なログを出力
if (process.env.NODE_ENV === "development") {
	logger.add(
		new winston.transports.File({
			filename: "logs/error.log",
			level: "error",
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.json(),
			),
		}),
	);
	logger.add(
		new winston.transports.File({
			filename: "logs/combined.log",
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.json(),
			),
		}),
	);
}

export { logger };
