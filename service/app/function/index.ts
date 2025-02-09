import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import {
	HarmBlockThreshold,
	HarmCategory,
	VertexAI,
} from "@google-cloud/vertexai";
import { ulid } from "ulid";
import type { Contents } from "../types";
import { logger } from "../utils/logger";
import { uploadAudio, uploadText } from "./storage";

const MAX_INPUT_TOKENS = process.env.MAX_INPUT_TOKENS
	? Number.parseInt(process.env.MAX_INPUT_TOKENS)
	: 1000;
const MAX_OUTPUT_TOKENS = process.env.MAX_OUTPUT_TOKENS
	? Number.parseInt(process.env.MAX_OUTPUT_TOKENS)
	: 100;

// Vertex AIでのコンテン0ツ処理
export async function createContent(url: string, tenantId: string) {
	const contentId = ulid();
	logger.info({
		message: "処理開始",
		tenantId,
		contentId,
		url: url.toString(),
		timestamp: new Date().toISOString(),
	});

	const startTime = performance.now();

	try {
		// テキスト処理
		const model = initializeAIModel();
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
		logger.info({
			message: "処理結果",
			contentId,
			tenantId,
			content,
			res,
		});

		let contents: Contents;
		if (res.candidates?.[0]?.finishReason === "MAX_TOKENS") {
			try {
				// 最後のペアを探す
				// [{"en": "aaaaaa", "ja": "あああ"}, {"en": "aaaaa", "ja": "あああ"}]
				const index = rawText.lastIndexOf(", {");
				if (index === -1) {
					throw new Error("有効なペアが見つかりませんでした");
				}
				const json = `${rawText.slice(0, index)} ]}`;
				contents = JSON.parse(json);
			} catch (error) {
				logger.error({
					message: "JSON解析エラー",
					error,
				});
				throw new Error("翻訳結果の解析に失敗しました");
			}
		} else {
			contents = JSON.parse(rawText);
		}

		const endTime = performance.now();
		const processingTime = endTime - startTime;

		const outputData = {
			timestamp: new Date().toISOString(),
			inputUrl: url,
			isYouTube: false,
			processingTime,
			result: JSON.stringify(contents),
			contentId,
			finishReason: res.candidates?.[0]?.finishReason || "UNKNOWN",
			counTotalTokens: count.totalTokens,
			totalTokens: res.usageMetadata?.totalTokenCount || 0,
		};
		await uploadText(JSON.stringify(outputData, null, 2), contentId, tenantId);

		// 音声処理
		const client = new TextToSpeechClient();
		const audioContents = [];
		for (let i = 0; i < contents.body.length; i++) {
			const [response] = await client.synthesizeSpeech({
				input: { text: contents.body[i].en },
				voice: { languageCode: "en-US", name: "en-US-Neural2-I" },
				audioConfig: {
					audioEncoding: "MP3",
					sampleRateHertz: 24000,
					effectsProfileId: ["handset-class-device"],
					pitch: 0,
					speakingRate: 1.0,
				},
			});
			if (
				response.audioContent &&
				response.audioContent instanceof Uint8Array
			) {
				// ストレージにアップロード
				await uploadAudio(
					Buffer.from(response.audioContent),
					contentId,
					i + 1,
					tenantId,
				);
				// Base64エンコードしてクライアントに返す
				audioContents.push(
					Buffer.from(response.audioContent).toString("base64"),
				);
			}
		}

		logger.info({
			message: "処理完了",
			tenantId,
			contentId,
			url: url.toString(),
			processingTime: `${processingTime.toFixed(2)}ミリ秒`,
			finishReason: res.candidates?.[0]?.finishReason || "UNKNOWN",
			totalTokens: res.usageMetadata?.totalTokenCount || 0,
			timestamp: new Date().toISOString(),
		});

		return {
			contentId,
			contents: contents,
			audioContents,
			processingTime,
			finishReason: res.candidates?.[0]?.finishReason || "UNKNOWN",
			countTotalTokens: count.totalTokens,
			totalTokens: res.usageMetadata?.totalTokenCount || 0,
		};
	} catch (error) {
		logger.error({
			message: "Content processing failed",
			contentId,
			tenantId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		throw error;
	}
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

// AIモデルの初期化
function initializeAIModel() {
	const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
	if (!GCP_PROJECT_ID) {
		throw new Error("GCP_PROJECT_ID is not set");
	}
	const GCP_LOCATION = process.env.GCP_LOCATION;
	if (!GCP_LOCATION) {
		throw new Error("GCP_LOCATION is not set");
	}
	const VERTEX_AI_MODEL = process.env.VERTEX_AI_MODEL;
	if (!VERTEX_AI_MODEL) {
		throw new Error("VERTEX_AI_MODEL is not set");
	}
	const vertexAI = new VertexAI({
		project: GCP_PROJECT_ID,
		location: GCP_LOCATION,
	});

	return vertexAI.preview.getGenerativeModel(
		{
			model: VERTEX_AI_MODEL,
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

function createWebPageTranscriptionAndTranslationRequest(
	fileUri: FormDataEntryValue,
) {
	const textPart = {
		text: `
Follow these instructions.

DO NOT INCLUDE SUMMARIES, INTERPRETATIONS, OR OPINIONS. WE NEED JUST ARTICLE CONTENT.
If you include anything extra, it will be absolutely unacceptable.  

1. Extract only the main article content, exactly as it is, without HTML or metadata.  
2. Translate each sentence separately: English to Japanese, Japanese to English.  
3. Output the result just like this: {"title": "xxxx", {"body": [{"en": "xxxxxx", "ja": "xxxxx"}, {"en": "xxxxxx", "ja": "xxxxx"}]}
4. Absolutely no extra text, code blocks, or formatting characters.  

`,
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
