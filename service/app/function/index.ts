import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import {
	HarmBlockThreshold,
	HarmCategory,
	VertexAI,
} from "@google-cloud/vertexai";
import type { Contents } from "~/types";
import { uploadAudio, uploadText } from "./storage";

const MAX_INPUT_TOKENS = 3000;
const MAX_OUTPUT_TOKENS = 300;

// Vertex AIでのコンテンツ処理
export async function processWebContent(
	url: string,
	contentId: string,
	userId: number,
) {
	if (!process.env.GCP_PROJECT_ID) {
		throw new Error("GCP_PROJECT_ID is not set");
	}

	// テキスト処理
	const startTime = performance.now();
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
	console.log(res);
	console.log(content);

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
			console.error("JSON解析エラー:", error);
			throw new Error("翻訳結果の解析に失敗しました");
		}
	} else {
		contents = JSON.parse(rawText);
	}
	console.log(contents);

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
	await uploadText(JSON.stringify(outputData, null, 2), contentId, userId);

	// 音声処理
	const client = new TextToSpeechClient();
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

		if (response.audioContent && response.audioContent instanceof Uint8Array) {
			await uploadAudio(
				Buffer.from(response.audioContent),
				contentId,
				i + 1,
				userId,
			);
		}
	}

	return {
		contents: contents,
		processingTime,
		finishReason: res.candidates?.[0]?.finishReason || "UNKNOWN",
		countTotalTokens: count.totalTokens,
		totalTokens: res.usageMetadata?.totalTokenCount || 0,
	};
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
3. Output the result in this format: {"title": "xxxx", {"body": [{"en": "xxxxxx", "ja": "xxxxx"}, {"en": "xxxxxx", "ja": "xxxxx"}]}
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
