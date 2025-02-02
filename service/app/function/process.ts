import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import {
	type CountTokensResponse,
	type GenerateContentResponse,
	HarmBlockThreshold,
	HarmCategory,
	VertexAI,
} from "@google-cloud/vertexai";
import type { TranslationPair } from "~/types";
import {
	createWebPageTranscriptionAndTranslationRequest,
	saveOutputFile,
	saveSpeechFile,
} from "./index";

const MAX_INPUT_TOKENS = 3000;
const MAX_OUTPUT_TOKENS = 2000;

// Vertex AIでのコンテンツ処理
export async function processWebContent(url: string, eventId: string) {
	if (!process.env.GCP_PROJECT_ID) {
		throw new Error("GCP_PROJECT_ID is not set");
	}

	const model = initializeAIModel();
	const startTime = performance.now();

	const req = createWebPageTranscriptionAndTranslationRequest(url);
	const count = await model.countTokens(req);

	if (count.totalTokens > MAX_INPUT_TOKENS) {
		throw new Error(
			`トークン数が制限を超えています（${count.totalTokens} > ${MAX_INPUT_TOKENS.toLocaleString()}）`,
		);
	}

	const result = await model.generateContent(req);
	const res = await result.response;
	const content = res.candidates?.[0]?.content;
	const rawText = content?.parts?.[0]?.text || "";

	const translationPairs = await parseContent(
		rawText,
		res.candidates?.[0]?.finishReason === "MAX_TOKENS",
	);

	const endTime = performance.now();
	const processingTime = endTime - startTime;

	// 結果を保存
	await saveResults(url, eventId, translationPairs, processingTime, res, count);

	// 音声を生成・保存
	await generateAndSaveAudio(translationPairs, eventId);

	return {
		translationPairs,
		processingTime,
		finishReason: res.candidates?.[0]?.finishReason || "UNKNOWN",
		countTotalTokens: count.totalTokens,
		totalTokens: res.usageMetadata?.totalTokenCount || 0,
	};
}

// 音声データの取得（Base64エンコード）
export async function getAudioContents(eventId: string, count: number) {
	const audioContents: string[] = [];
	for (let i = 1; i <= count; i++) {
		try {
			const filePath = join(
				process.cwd(),
				"output",
				"audio",
				`${eventId}-${i}.mp3`,
			);
			const fileBuffer = await readFile(filePath);
			const base64Audio = fileBuffer.toString("base64");
			audioContents.push(`data:audio/mp3;base64,${base64Audio}`);
		} catch (error) {
			console.error(`音声ファイルの読み込みエラー (${i}):`, error);
		}
	}
	return audioContents;
}

// エラーハンドリング
export function handleError(error: unknown) {
	console.error("エラー:", error);

	if (error instanceof Error) {
		if (error.message.includes("URL_ROBOTED-ROBOTED_DENIED")) {
			return {
				status: "error",
				message: "アクセス制限エラー",
				error: "このウェブサイトはAIによる自動アクセスを許可していません。",
			};
		}

		return {
			status: "error",
			message: "処理中にエラーが発生しました",
			error: error.message,
		};
	}

	return {
		status: "error",
		message: "不明なエラーが発生しました",
		error: "詳細不明",
	};
}

// 以下、内部で使用する関数群
function initializeAIModel() {
	const vertexAI = new VertexAI({
		project: process.env.GCP_PROJECT_ID,
		location: "asia-northeast1",
	});

	return vertexAI.preview.getGenerativeModel(
		{
			model: "gemini-1.5-flash",
			safetySettings: [
				{
					category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
					threshold: HarmBlockThreshold.BLOCK_NONE,
				},
				{
					category: HarmCategory.HARM_CATEGORY_HARASSMENT,
					threshold: HarmBlockThreshold.BLOCK_NONE,
				},
				{
					category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
					threshold: HarmBlockThreshold.BLOCK_NONE,
				},
				{
					category: HarmCategory.HARM_CATEGORY_UNSPECIFIED,
					threshold: HarmBlockThreshold.BLOCK_NONE,
				},
				{
					category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
					threshold: HarmBlockThreshold.BLOCK_NONE,
				},
			],
			generationConfig: {
				maxOutputTokens: MAX_OUTPUT_TOKENS,
				temperature: 0.5,
				topP: 0.95,
			},
		},
		{ timeout: 300000 },
	);
}

async function parseContent(
	rawText: string,
	isMaxTokensReached: boolean,
): Promise<TranslationPair[]> {
	if (isMaxTokensReached) {
		return parseMaxTokensContent(rawText);
	}
	return JSON.parse(rawText);
}

async function parseMaxTokensContent(
	rawText: string,
): Promise<TranslationPair[]> {
	let fixedJson = rawText;
	const len = fixedJson.length - 1;

	if (fixedJson.lastIndexOf('",') === len) {
		fixedJson = `${fixedJson} "ja": "（処理が途中で終了しました）"}]`;
	} else if (fixedJson.lastIndexOf('", ') === len) {
		fixedJson = `${fixedJson}"ja": "（処理が途中で終了しました）"}]`;
	} else if (fixedJson.lastIndexOf('", "') === len) {
		fixedJson = `${fixedJson}ja": "（処理が途中で終了しました）"}]`;
	} else if (fixedJson.lastIndexOf('", "j') === len) {
		fixedJson = `${fixedJson}a": "（処理が途中で終了しました）"}]`;
	} else if (fixedJson.lastIndexOf('", "ja') === len) {
		fixedJson = `${fixedJson}": "（処理が途中で終了しました）"}]`;
	} else if (fixedJson.lastIndexOf('", "ja"') === len) {
		fixedJson = `${fixedJson}: "（処理が途中で終了しました）"}]`;
	} else if (fixedJson.lastIndexOf('", "ja":') === len) {
		fixedJson = `${fixedJson} "（処理が途中で終了しました）"}]`;
	} else if (fixedJson.lastIndexOf('", "ja": ') === len) {
		fixedJson = `${fixedJson}"（処理が途中で終了しました）"}]`;
	} else if (fixedJson.lastIndexOf('", "ja": "') === len) {
		fixedJson = `${fixedJson}（処理が途中で終了しました）"}]`;
	} else if (fixedJson.lastIndexOf('", "ja": "') !== -1) {
		fixedJson = `${fixedJson} "}]`;
	} else if (fixedJson.lastIndexOf('{"en": "') !== -1) {
		fixedJson = `${fixedJson} ", "ja": "（処理が途中で終了しました）"}]`;
	} else {
		throw new Error("有効なペアが見つかりませんでした");
	}

	console.log(fixedJson);
	return JSON.parse(fixedJson);
}

async function saveResults(
	url: string,
	eventId: string,
	translationPairs: TranslationPair[],
	processingTime: number,
	res: GenerateContentResponse,
	count: CountTokensResponse,
) {
	const outputData = {
		timestamp: new Date().toISOString(),
		inputUrl: url,
		isYouTube: false,
		processingTime,
		result: JSON.stringify(translationPairs),
		eventId,
		finishReason: res.candidates?.[0]?.finishReason || "UNKNOWN",
		counTotalTokens: count.totalTokens,
		totalTokens: res.usageMetadata?.totalTokenCount || 0,
	};

	await saveOutputFile(outputData);
}

async function generateAndSaveAudio(
	translationPairs: TranslationPair[],
	eventId: string,
) {
	const client = new TextToSpeechClient();

	for (let i = 0; i < translationPairs.length; i++) {
		const [response] = await client.synthesizeSpeech({
			input: { text: translationPairs[i].en },
			voice: { languageCode: "en-US", name: "en-US-Neural2-I" },
			audioConfig: {
				audioEncoding: "MP3",
				sampleRateHertz: 24000,
				effectsProfileId: ["handset-class-device"],
				pitch: 0,
				speakingRate: 1.0,
			},
		});

		if (response.audioContent && response.audioContent instanceof Uint8Array) {
			await saveSpeechFile(response.audioContent, eventId, i + 1);
		}
	}
}
