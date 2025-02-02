export type TranslationPair = {
	en: string;
	ja: string;
};

export type ActionResponse = {
	status: "success" | "error" | "500";
	message: string;
	response?: TranslationPair[];
	error?: string;
	processingTime?: string;
	savedFile?: string;
	usageTokens?: number;
};
