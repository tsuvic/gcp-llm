export type Contents = {
	title: string;
	body: {
		en: string;
		ja: string;
	}[];
};

export type ActionResponse = {
	status: "success" | "error" | "500";
	message: string;
	contents?: Contents;
	error?: string;
	processingTime?: string;
	savedFile?: string;
	usageTokens?: number;
};
