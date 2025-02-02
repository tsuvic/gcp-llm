import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function createWebpageLanguageDetectionRequest(fileUri: FormDataEntryValue) {
	const textPart = {
		text: `Analyze the following webpage content and determine if it's primarily in Japanese or English. 
        Just respond with either "ja" or "en". Do not include any other text in your response.`,
	};
	const filePart = {
		fileData: {
			mimeType: "text/html",
			fileUri: fileUri.toString(),
		},
	};
	return {
		contents: [
			{
				role: "user",
				parts: [textPart, filePart],
			},
		],
	};
}

function createVideoLanguageDetectionRequest(fileUri: FormDataEntryValue) {
	const textPart = {
		text: `Analyze the following video transcription and determine if the speech is primarily in Japanese or English. 
        Just respond with either "ja" or "en". Do not include any other text in your response.`,
	};
	const filePart = {
		fileData: {
			mimeType: "video/*",
			fileUri: fileUri.toString(),
		},
	};
	return {
		contents: [
			{
				role: "user",
				parts: [textPart, filePart],
			},
		],
	};
}

function createWebpageTranscriptionRequest(fileUri: FormDataEntryValue) {
	const textPart = {
		text: `Extract the main content from this webpage, excluding any HTML tags (e.g., links, code snippets, etc.). Only output the text content, without any HTML or code elements. If the input is in English, output the text in English, and if the input is in Japanese, output the text in Japanese.`,
	};
	const filePart = {
		fileData: {
			mimeType: "text/html",
			fileUri: fileUri.toString(),
		},
	};
	return {
		contents: [
			{
				role: "user",
				parts: [textPart, filePart],
			},
		],
	};
}

function createVideoTranscriptionRequest(fileUri: FormDataEntryValue) {
	const textPart = {
		text: `Transcribe the speech from this video and include timestamps for each sentence. Just output the extracted text without any additional response. If the input is English, output the text in English. If the input is Japanese, output the text in Japanese.`,
	};
	const filePart = {
		fileData: {
			mimeType: "video/*",
			fileUri: fileUri.toString(),
		},
	};
	return {
		contents: [
			{
				role: "user",
				parts: [textPart, filePart],
			},
		],
	};
}

function createWebpageTranscriptionWithLangRequest(
	fileUri: FormDataEntryValue,
	language: string,
) {
	const textPart = {
		text:
			language === "ja"
				? `このWebページの本文を抽出してください。タイトル、ヘッダー、フッターなどの本文と関係ない部分は除外してください。抽出したテキストのみ出力してください。`
				: `Extract the main text from this webpage. Exclude the title, header, footer, and any other content not related to the main body of the text. Just output the extracted text without any additional response.`,
	};
	const filePart = {
		fileData: {
			mimeType: "text/html",
			fileUri: fileUri.toString(),
		},
	};
	return {
		contents: [
			{
				role: "user",
				parts: [textPart, filePart],
			},
		],
	};
}

function createVideoTranscriptionWithLangRequest(
	fileUri: FormDataEntryValue,
	language: string,
) {
	const textPart = {
		text:
			language === "ja"
				? `この動画の音声を文字起こししてください。各文章にタイムスタンプを含めてください。文字起こし結果のみ出力してください。`
				: `Please transcribe the speech from this video and include timestamps for each sentence. Just output the transcription without any additional response.`,
	};
	const filePart = {
		fileData: {
			mimeType: "video/*",
			fileUri: fileUri.toString(),
		},
	};
	return {
		contents: [
			{
				role: "user",
				parts: [textPart, filePart],
			},
		],
	};
}

export function createWebPageTranscriptionAndTranslationRequest(
	fileUri: FormDataEntryValue,
) {
	const textPart = {
		text: `Extract the main content from this webpage, removing all HTML tags and code elements. Then, translate the extracted text: if it's in English, translate it to Japanese; if it's in Japanese, translate it to English. Each sentence should be treated as a single unit.
		Output the result as a pure JSON array without any additional formatting,
		like this:[{"en": "xxxxxx", "ja": "xxxxx"}, {"en": "xxxxxx", "ja": "xxxxx"}]
		Ensure that the response contains only the JSON array, without any extra text, code blocks, or formatting characters.`,
	};
	const filePart = {
		fileData: {
			mimeType: "text/html",
			fileUri: fileUri.toString(),
		},
	};
	return {
		contents: [
			{
				role: "user",
				parts: [textPart, filePart],
			},
		],
	};
}

function createTranslationRequest(outputData: {
	timestamp: string;
	inputUrl: string;
	isYouTube: boolean;
	processingTime: number;
	result: string;
}) {
	const textPart = {
		text: `Translate the following text to English if it's in Japanese, or to Japanese if it's in English. Output each sentence pair (one English sentence followed by its Japanese translation) on separate lines with a single newline between each pair.

Text to translate:
    ${outputData.result}`,
	};
	return {
		contents: [
			{
				role: "user",
				parts: [textPart],
			},
		],
	};
}

export async function saveOutputFile(outputData: {
	timestamp: string;
	inputUrl: string;
	isYouTube: boolean;
	processingTime: number;
	result: string;
}) {
	const outputPath = join(process.cwd(), "output");
	const fileName = `result-${Date.now()}.json`;

	try {
		await mkdir(outputPath, { recursive: true });
		await writeFile(
			join(outputPath, fileName),
			JSON.stringify(outputData, null, 2),
			"utf-8",
		);
		console.log(`結果を保存しました: ${fileName}`);
		return fileName;
	} catch (error) {
		console.error("ファイル保存エラー:", error);
		return "";
	}
}
