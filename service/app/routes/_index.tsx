import { join } from "path";
import {
	HarmBlockThreshold,
	HarmCategory,
	VertexAI,
} from "@google-cloud/vertexai";
import {
	type ActionFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { mkdir, writeFile } from "fs/promises";
import { useState } from "react";

export const meta: MetaFunction = () => {
	return [
		{ title: "New Remix App" },
		{ name: "description", content: "Welcome to Remix!" },
	];
};

export async function action({ request }: ActionFunctionArgs) {
	try {
		const formData = await request.formData();
		const url = formData.get("fileUri");

		if (!url) {
			return {
				status: "error",
				message: "エラー",
				error: "URLを入力してください",
			};
		}

		if (!process.env.GCP_PROJECT_ID) {
			throw new Error("GCP_PROJECT_ID is not set");
		}

		// AIモデルの初期化
		const project = process.env.GCP_PROJECT_ID;
		const location = "asia-northeast1";
		const vertexAI = new VertexAI({
			project,
			location,
		});

		const model = vertexAI.preview.getGenerativeModel(
			{
				model: "gemini-1.5-pro-002",
				safetySettings: [
					{
						category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
						threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
					},
				],
				generationConfig: {
					maxOutputTokens: 1000,
					temperature: 0.5,
					topP: 0.95,
				},
				systemInstruction: {
					role: "system",
					parts: [{ text: "You are a helpful assistant." }],
				},
			},
			{
				timeout: 300000, //milliseconds
			},
		);

		const startTime = performance.now();

		try {
			// YouTubeのURL形式をチェック
			const youtubeUrlPattern =
				/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

			// 言語検出
			const isYouTube = youtubeUrlPattern.test(url.toString());
			const langDetectReq = isYouTube
				? createVideoLanguageDetectionRequest(url)
				: createWebpageLanguageDetectionRequest(url);
			const langResult = await model.generateContent(langDetectReq);
			const langResponse = await langResult.response;
			const detectedLang =
				langResponse.candidates?.[0]?.content?.parts?.[0]?.text
					?.trim()
					.toLowerCase() || "ja";

			const langDetectEndTime = performance.now();
			const langDetectProcessingTime = langDetectEndTime - startTime;
			console.log(
				`トランスクリプト処理時間: ${langDetectProcessingTime}ミリ秒`,
			);
			console.log(`検出言語: ${detectedLang}`);
			console.log(langResponse);

			// 検出された言語に基づいてリクエスト
			const finalReq = isYouTube
				? createVideoTranscriptionRequest(url, detectedLang)
				: createWebpageTranscriptionRequest(url, detectedLang);

			const result = await model.generateContent(finalReq);
			const res = await result.response;

			const transcriptEndTime = performance.now();
			const transcriptProcessingTime = transcriptEndTime - startTime;

			console.log(
				`トランスクリプト処理時間: ${transcriptProcessingTime}ミリ秒`,
			);
			console.log(res);

			if (!res.candidates?.[0]?.content?.parts?.[0]?.text) {
				throw new Error("AIからの応答が不正な形式です");
			}

			// 結果をJSONとして保存
			const outputData = {
				timestamp: new Date().toISOString(),
				inputUrl: url.toString(),
				isYouTube: youtubeUrlPattern.test(url.toString()),
				processingTime: transcriptProcessingTime,
				result: res.candidates[0].content.parts[0].text,
			};

			const outputPath = join(process.cwd(), "output");
			const fileName = `result-${Date.now()}.json`;

			try {
				await writeFile(
					join(outputPath, fileName),
					JSON.stringify(outputData, null, 2),
					"utf-8",
				);
				console.log(`結果を保存しました: ${fileName}`);
			} catch (error) {
				console.error("ファイル保存エラー:", error);
			}

			return {
				status: "success",
				message: "リクエストが正常に処理されました",
				response: res.candidates[0].content.parts[0].text,
				processingTime: `${transcriptProcessingTime.toFixed(2)}ミリ秒`,
				savedFile: fileName,
				detectedLanguage: detectedLang === "ja" ? "日本語" : "English",
				usageTokens: res.usageMetadata?.totalTokenCount || 0,
			};
		} catch (error) {
			console.error("AI処理エラー:", error);
			return {
				status: "500",
				message: "AI処理中にエラーが発生しました",
				error: error instanceof Error ? error.message : "不明なエラー",
			};
		}
	} catch (error) {
		console.error("サーバーエラー:", error);
		return {
			status: "500",
			message: "サーバーでエラーが発生しました",
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}

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

	function createWebpageTranscriptionRequest(
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

	function createVideoTranscriptionRequest(
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
}

export default function Index() {
	const actionData = useActionData<typeof action>();
	const [fileUri, setFileUri] = useState<string>("");
	const navigation = useNavigation();
	const isProcessing = navigation.state === "submitting";

	return (
		<div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
			{/* 固定ヘッダー部分をコンパクトに */}
			<div className="flex-none p-4">
				<div className="max-w-4xl mx-auto">
					<h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
						Gemini Practice
					</h1>

					<Form method="post">
						<div className="flex gap-4">
							<input
								type="text"
								id="fileUri"
								name="fileUri"
								value={fileUri}
								onChange={(e) => setFileUri(e.target.value)}
								placeholder="URLを入力してください"
								className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
										bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
										focus:ring-2 focus:ring-blue-500 focus:border-transparent
										transition duration-200 ease-in-out"
							/>
							<button
								type="submit"
								disabled={isProcessing}
								className={`px-6 py-3 text-lg font-medium text-white w-48
										rounded-lg focus:outline-none focus:ring-2 
										focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out
										${
											isProcessing
												? "bg-blue-400 cursor-not-allowed"
												: "bg-blue-600 hover:bg-blue-700"
										}`}
							>
								{isProcessing ? (
									<div className="flex items-center justify-center gap-2">
										<svg
											className="animate-spin h-5 w-5 text-white"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										<span>処理中...</span>
									</div>
								) : (
									"文字起こしを開始"
								)}
							</button>
						</div>
					</Form>
				</div>
			</div>

			{/* 結果表示部分 */}
			<div className="flex-1 overflow-y-auto p-4 pb-6">
				<div className="max-w-4xl mx-auto h-[calc(100%-1rem)]">
					<div
						className={`h-full rounded-lg border p-4 ${
							actionData?.status === "error"
								? "border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/10"
								: "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
						}`}
					>
						{actionData && (
							<div className="h-full flex flex-col">
								<p
									className={`flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed ${
										actionData.status === "error"
											? "text-red-600 dark:text-red-400"
											: "text-gray-700 dark:text-gray-300"
									}`}
								>
									{actionData.status === "error"
										? `${actionData.message}: ${actionData.error}`
										: actionData.response}
								</p>
								{actionData.status === "success" && (
									<div className="flex-none mt-2 pt-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 space-y-1">
										<p>識別言語: {actionData.detectedLanguage}</p>
										<p>使用トークン: {actionData.usageTokens}</p>
										<p>処理時間: {actionData.processingTime}</p>
										<p>保存ファイル: {actionData.savedFile}</p>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
