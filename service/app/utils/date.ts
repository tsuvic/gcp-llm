const JP_TIMEZONE = "Asia/Tokyo";

export function toJSTString(date: Date): string {
	return date.toLocaleString("ja-JP", {
		timeZone: JP_TIMEZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

export function toJSTDate(date: Date): Date {
	return new Date(date.toLocaleString("en-US", { timeZone: JP_TIMEZONE }));
}
