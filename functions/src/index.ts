import { Firestore, Timestamp } from "@google-cloud/firestore";
import * as ff from "@google-cloud/functions-framework";
import type { CloudEvent } from "@google-cloud/functions-framework/build/src/functions";
import { Storage } from "@google-cloud/storage";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import {
	HarmBlockThreshold,
	HarmCategory,
	VertexAI,
} from "@google-cloud/vertexai";
import { ulid } from "ulid";
import winston from "winston";

const MAX_INPUT_TOKENS = process.env.MAX_INPUT_TOKENS
	? Number.parseInt(process.env.MAX_INPUT_TOKENS)
	: 1000;
const MAX_OUTPUT_TOKENS = process.env.MAX_OUTPUT_TOKENS
	? Number.parseInt(process.env.MAX_OUTPUT_TOKENS)
	: 100;

const storage = new Storage();
const bucketName = process.env.GCP_STORAGE_BUCKET;
if (!bucketName) {
	throw new Error("GCP_STORAGE_BUCKET is not set");
}
const gcpProjectId = process.env.GCP_PROJECT_ID;
if (!gcpProjectId) {
	throw new Error("GCP_PROJECT_ID is not set");
}
const gcpLocation = process.env.GCP_LOCATION;
if (!gcpLocation) {
	throw new Error("GCP_LOCATION is not set");
}
const gcpDatabaseId = process.env.GCP_DATABASE_ID;
if (!gcpDatabaseId) {
	throw new Error("GCP_DATABASE_ID is not set");
}
const db = new Firestore({
	projectId: gcpProjectId,
	databaseId: gcpDatabaseId,
});

interface PubSubMessage {
	message: {
		data: string;
		messageId: string;
		publishTime: string;
	};
}

type Contents = {
	title: string;
	body: {
		en: string;
		ja: string;
	}[];
};

interface MessageData {
	url: string;
	tenantId: string;
}

interface ContentSetCollection {
	url: string; // 元のURL
	audioCount: number; // 音声ファイルの数
	title: string; // コンテンツのタイトル
	createdAt: Timestamp; // 作成日時
	updatedAt: Timestamp; // 更新日時
	status: "processing" | "completed" | "error"; // 処理状態
}

interface ContentGetCollection {
	contentId: string; // コンテンツのID
	url: string; // 元のURL
	audioCount: number; // 音声ファイルの数
	title: string; // コンテンツのタイトル
	createdAt: Date; // 作成日時
	updatedAt: Date; // 更新日時
	status: "processing" | "completed" | "error"; // 処理状態
}

ff.cloudEvent<PubSubMessage>(
	"invokeVertexAI",
	async (cloudEvent: CloudEvent<PubSubMessage>) => {
		logger.info({
			message: "function 処理開始",
			timestamp: new Date().toISOString(),
			cloudEvent,
		});

		const pubSubData = Buffer.from(
			cloudEvent.data?.message.data || "",
			"base64",
		).toString();
		logger.info({
			message: "PubSubメッセージ",
			pubSubData,
		});

		const messageData = JSON.parse(pubSubData) as MessageData;
		logger.info({
			message: "メッセージデータ",
			messageData,
		});

		const { url, tenantId } = messageData;
		const contentId = ulid();

		try {
			const startTime = performance.now();
			logger.info({
				message: "vertexai 処理開始",
				tenantId,
				contentId,
				url: url.toString(),
				timestamp: new Date().toISOString(),
			});

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
			const endTime = performance.now();

			let contents: Contents;
			if (res.candidates?.[0]?.finishReason === "MAX_TOKENS") {
				try {
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
			await uploadText(
				JSON.stringify(outputData, null, 2),
				contentId,
				tenantId,
			);

			logger.info({
				message: "vertexai 処理結果",
				contentId,
				tenantId,
				content,
				res,
				processingTime,
				timestamp: new Date().toISOString(),
			});

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

			const now = new Date();
			const resultContent: ContentSetCollection = {
				url: url.toString(),
				audioCount: contents.body.length,
				title: contents.title,
				createdAt: Timestamp.fromDate(now),
				updatedAt: Timestamp.fromDate(now),
				status: "completed",
			};

			await saveContent(resultContent, tenantId, contentId);

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

			return new Response(JSON.stringify({ contentId: contentId }), {
				status: 200,
				headers: {
					"Content-Type": "application/json",
				},
			});
		} catch (error) {
			logger.error({
				message: "Content processing failed",
				contentId,
				tenantId,
				error: error instanceof Error ? error.message : "Unknown error",
			});

			const now = new Date();
			const resultContent: ContentSetCollection = {
				url: url.toString(),
				audioCount: 0,
				title:
					"処理に失敗しました。対象のURLがAIによる自動アクセスを許可していない可能性があります。他のURLで再度お試しください。",
				createdAt: Timestamp.fromDate(now),
				updatedAt: Timestamp.fromDate(now),
				status: "error",
			};
			await saveContent(resultContent, tenantId, contentId);
			throw error;
		}
	},
);

async function uploadToCloudStorage(
	content: string | Buffer,
	path: string,
	contentType: string,
) {
	if (!bucketName) {
		throw new Error("GCP_STORAGE_BUCKET is not set");
	}

	const bucket = storage.bucket(bucketName);
	const file = bucket.file(path);

	try {
		await file.save(content, {
			contentType,
			metadata: {
				cacheControl: "public, max-age=31536000",
			},
		});

		const gcsPath = `gs://${bucketName}/${path}`;

		return gcsPath;
	} catch (error) {
		logger.error({
			message: "File upload failed",
			path: `gs://${bucketName}/${path}`,
			contentType,
			error: error instanceof Error ? error.message : "Unknown error",
		});

		throw error;
	}
}

async function uploadText(content: string, contentId: string, userId: string) {
	const path = `text/${userId}/${contentId}.json`;
	return uploadToCloudStorage(content, path, "application/json");
}

async function uploadAudio(
	content: Buffer,
	contentId: string,
	index: number,
	userId: string,
) {
	const path = `audio/${userId}/${contentId}-${index}.mp3`;
	return uploadToCloudStorage(content, path, "audio/mp3");
}

function initializeAIModel() {
	if (!gcpProjectId) {
		throw new Error("GCP_PROJECT_ID is not set");
	}
	if (!gcpLocation) {
		throw new Error("GCP_LOCATION is not set");
	}
	const vertexAI = new VertexAI({
		project: gcpProjectId,
		location: gcpLocation,
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

const saveContent = async (
	data: ContentSetCollection,
	tenantId: string,
	contentId: string,
) => {
	try {
		const userDocRef = db.collection("users").doc(tenantId);
		const contentDocRef = userDocRef.collection("contents").doc(contentId);
		await contentDocRef.set(data);
		return contentId;
	} catch (error) {
		logger.error({
			message: "Failed to save content to Firestore",
			userId: tenantId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		throw error;
	}
};

const isDev = process.env.NODE_ENV === "development";
const logger = winston.createLogger({
	level: isDev ? "debug" : "info",
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.errors({ stack: true }),
		isDev ? winston.format.prettyPrint() : winston.format.json(),
	),
	defaultMeta: {
		service: "ArticlePlay",
		environment: process.env.NODE_ENV || "development",
	},
	transports: [new winston.transports.Console()],
});
