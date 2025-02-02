import {
	HarmBlockThreshold,
	HarmCategory,
	VertexAI,
} from "@google-cloud/vertexai";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import type { TranslationPair } from "~/types";
import {
	createWebPageTranscriptionAndTranslationRequest,
	saveOutputFile,
} from "../function";

const MAX_TOKENS = 5000;

export const meta: MetaFunction = () => {
	return [
		{ title: "Gemini Web Extractor" },
		{
			name: "description",
			content: "Extract and translate web content using Gemini AI",
		},
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
				model: "gemini-1.5-flash",
				safetySettings: [
					{
						category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
						threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
					},
				],
				generationConfig: {
					maxOutputTokens: 8000,
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
		console.log(
			`処理開始: ${new Date().toLocaleString("ja-JP", {
				timeZone: "Asia/Tokyo",
			})}`,
		);

		try {
			// // YouTubeのURL形式をチェック
			// const youtubeUrlPattern =
			// 	/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

			// // YouTubeのURLの場合はエラー
			// if (youtubeUrlPattern.test(url.toString())) {
			// 	return {
			// 		status: "error",
			// 		message: "エラー",
			// 		error: "YouTubeのURLは現在サポートしていません",
			// 	};
			// }

			const req = createWebPageTranscriptionAndTranslationRequest(url);
			const count = await model.countTokens(req);
			console.log(`トークン数: ${count.totalTokens}`);
			console.log(`請求文字数: ${count.totalBillableCharacters}`);

			// トークン数のチェックを追加
			if (count.totalTokens > MAX_TOKENS) {
				return {
					status: "error",
					message: "エラー",
					error: `トークン数が制限を超えています（${count.totalTokens} > ${MAX_TOKENS.toLocaleString()}）。より短いコンテンツを指定してください。`,
				};
			}

			const result = await model.generateContent(req);
			const res = await result.response;

			const endTime = performance.now();
			const processingTime = endTime - startTime;

			console.log(
				`処理終了: ${new Date().toLocaleString("ja-JP", {
					timeZone: "Asia/Tokyo",
				})}`,
			);
			console.log(`処理時間: ${processingTime.toFixed(2)}ミリ秒`);
			console.log(res.candidates?.[0]?.content);
			console.log(res);

			const translationPairs = JSON.parse(
				res.candidates?.[0]?.content?.parts?.[0]?.text || "[]",
			) as TranslationPair[];

			const outputData = {
				timestamp: new Date().toISOString(),
				inputUrl: url.toString(),
				isYouTube: false,
				processingTime: processingTime,
				result: JSON.stringify(translationPairs),
			};
			const fileNameForTranscription = await saveOutputFile(outputData);

			return {
				status: "success",
				message: "リクエストが正常に処理されました",
				response: translationPairs,
				processingTime: `${processingTime.toFixed(2)}ミリ秒`,
				savedFile: fileNameForTranscription,
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
											aria-hidden="true"
										>
											<title>Loading spinner</title>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
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
								{actionData.status === "success" ? (
									<div className="flex-1 flex flex-col overflow-hidden">
										<div className="flex-1 overflow-y-auto">
											{actionData.response?.map((pair) => (
												<div
													key={pair.en.slice(0, 20)}
													className="mb-6 last:mb-0 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
												>
													<p className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
														{pair.en}
													</p>
													<p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
														{pair.ja}
													</p>
												</div>
											))}
										</div>
									</div>
								) : (
									<p className="flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-red-600 dark:text-red-400">
										{`${actionData.message}: ${actionData.error}`}
									</p>
								)}
								{actionData.status === "success" && (
									<div className="flex-none mt-2 pt-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 space-y-1">
										<div>
											<p>書き起こし</p>
											<p className="ml-4">
												トークン数: {actionData.usageTokens}
											</p>
											<p className="ml-4">
												処理時間: {actionData.processingTime}
											</p>
											<p className="ml-4">
												保存ファイル: {actionData.savedFile}
											</p>
										</div>
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
