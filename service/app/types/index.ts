import type { Timestamp } from "@google-cloud/firestore";

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

export interface ContentSetCollection {
	url: string; // 元のURL
	audioCount: number; // 音声ファイルの数
	title: string; // コンテンツのタイトル
	createdAt: Timestamp; // 作成日時
	updatedAt: Timestamp; // 更新日時
	status: "processing" | "completed" | "error"; // 処理状態
}

export interface ContentGetCollection {
	contentId: string; // コンテンツのID
	url: string; // 元のURL
	audioCount: number; // 音声ファイルの数
	title: string; // コンテンツのタイトル
	createdAt: Date; // 作成日時
	updatedAt: Date; // 更新日時
	status: "processing" | "completed" | "error"; // 処理状態
}
