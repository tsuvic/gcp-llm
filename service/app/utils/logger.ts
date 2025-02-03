import winston from "winston";

const isDev = process.env.NODE_ENV === "development";

const logger = winston.createLogger({
	level: isDev ? "debug" : "info",
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.errors({ stack: true }),
		isDev ? winston.format.prettyPrint() : winston.format.json(),
	),
	defaultMeta: {
		service: "articleplay",
		environment: process.env.NODE_ENV || "development",
	},
	transports: [new winston.transports.Console()],
});

// 開発環境の場合はより詳細なログを出力
// if (process.env.NODE_ENV === "development") {
// 	logger.add(
// 		new winston.transports.File({
// 			filename: "logs/error.log",
// 			level: "error",
// 			format: winston.format.combine(
// 				winston.format.timestamp(),
// 				winston.format.json(),
// 			),
// 		}),
// 	);
// 	logger.add(
// 		new winston.transports.File({
// 			filename: "logs/combined.log",
// 			format: winston.format.combine(
// 				winston.format.timestamp(),
// 				winston.format.json(),
// 			),
// 		}),
// 	);
// }

export { logger };
