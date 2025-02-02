import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
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
	saveSpeechFile,
} from "../function";
import { count, res } from "../response";

const MAX_INPUT_TOKENS = 3000;
const MAX_OUTPUT_TOKENS = 2000;

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
		const eventId = `${Date.now()}`;

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
				// systemInstruction: {
				// 	role: "system",
				// 	parts: [{ text: "You are a helpful assistant." }],
				// },
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
			if (count.totalTokens > MAX_INPUT_TOKENS) {
				return {
					status: "error",
					message: "エラー",
					error: `トークン数が制限を超えています（${count.totalTokens} > ${MAX_INPUT_TOKENS.toLocaleString()}）。より短いコンテンツを指定してください。`,
				};
			}

			const result = await model.generateContent(req);
			const res = await result.response;
			const content = res.candidates?.[0]?.content;
			console.log("content", content);
			console.log("res", res);

			// 最大トークン制限に達したかチェック
			const isMaxTokensReached =
				res.candidates?.[0]?.finishReason === "MAX_TOKENS";

			// JSONパースを試みる
			let translationPairs: TranslationPair[] = [];
			const rawText = content?.parts?.[0]?.text || "";

			try {
				if (isMaxTokensReached) {
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
						// 存在した場合。通常最初のペア崩れを拾うことを想定
					} else if (fixedJson.lastIndexOf('", "ja": "') !== -1) {
						fixedJson = `${fixedJson} "}]`;
					} else if (fixedJson.lastIndexOf('{"en": "') !== -1) {
						fixedJson = `${fixedJson} ", "ja": "（処理が途中で終了しました）"}]`;
					} else {
						throw new Error("有効なペアが見つかりませんでした");
					}

					console.log(fixedJson);

					try {
						translationPairs = JSON.parse(fixedJson) as TranslationPair[];
					} catch (parseError) {
						console.error("JSONパースエラー:", parseError);
						throw new Error("結果の解析に失敗しました");
					}
				} else {
					// 通常のJSONパース
					translationPairs = JSON.parse(rawText) as TranslationPair[];
				}

				if (isMaxTokensReached) {
					console.log(
						"最大トークン数に達したため、一部のペアは補完して返します",
					);
				}
			} catch (parseError) {
				console.error("JSONパースエラー:", parseError);
				return {
					status: "error",
					message: "エラー",
					error: "結果の解析に失敗しました",
				};
			}

			const endTime = performance.now();
			const processingTime = endTime - startTime;
			console.log(`処理時間: ${processingTime.toFixed(2)}ミリ秒`);

			// vertexai 結果を保存
			const outputData = {
				timestamp: new Date().toISOString(),
				inputUrl: url.toString(),
				isYouTube: false,
				processingTime: processingTime,
				result: JSON.stringify(translationPairs),
				eventId: eventId, // イベントIDを追加
				finishReason: res.candidates?.[0]?.finishReason || "UNKNOWN",
				counTotalTokens: count.totalTokens,
				totalTokens: res.usageMetadata?.totalTokenCount || 0,
			};
			const fileNameForTranscription = await saveOutputFile(outputData);

			// text to speech
			const client = new TextToSpeechClient();
			const audioContents: string[] = []; // Base64エンコードした音声データを保持する配列

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

				if (
					response.audioContent &&
					response.audioContent instanceof Uint8Array
				) {
					// ファイル保存
					await saveSpeechFile(response.audioContent, eventId, i + 1);
					// Base64エンコード
					const base64Audio = Buffer.from(response.audioContent).toString(
						"base64",
					);
					audioContents.push(`data:audio/mp3;base64,${base64Audio}`);
				}
			}

			return {
				status: "success",
				message: "リクエストが正常に処理されました",
				response: translationPairs,
				processingTime: `${processingTime.toFixed(2)}ミリ秒`,
				savedFile: fileNameForTranscription,
				finishReason: res.candidates?.[0]?.finishReason || "UNKNOWN",
				countTotalTokens: count.totalTokens,
				totalTokens: res.usageMetadata?.totalTokenCount || 0,
				audioContents, // Base64エンコードした音声データを返す
			};
		} catch (error) {
			console.error("AI処理エラー:", error);

			// robots.txtによるブロックのエラーメッセージをチェック
			if (
				error instanceof Error &&
				error.message.includes("URL_ROBOTED-ROBOTED_DENIED")
			) {
				return {
					status: "error",
					message: "アクセス制限エラー",
					error:
						"このウェブサイトはAIによる自動アクセスを許可していません。アクセスがブロックされています。",
				};
			}

			// その他のエラー
			return {
				status: "error",
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
									"実行"
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
											{actionData.response && actionData.response.length > 0 ? (
												actionData.response.map((pair, index) => (
													<div
														key={pair.en.slice(0, 20)}
														className="mb-6 last:mb-0 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
													>
														<p className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
															{pair.en}
														</p>
														<p className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
															{pair.ja}
														</p>
														{actionData.audioContents?.[index] && (
															<div className="flex items-center gap-4 bg-[#2c2c2c] dark:bg-gray-900 rounded-lg p-2">
																<div className="flex items-center gap-2">
																	<button
																		type="button"
																		onClick={() => {
																			const audio = document.getElementById(
																				`audio-${index}`,
																			) as HTMLAudioElement;
																			if (audio) {
																				audio.currentTime = Math.max(
																					0,
																					audio.currentTime - 2,
																				);
																			}
																		}}
																		className="p-2 text-gray-300 hover:text-white dark:text-gray-300 dark:hover:text-white bg-[#2c2c2c] dark:bg-gray-900 hover:bg-[#444444] dark:hover:bg-gray-800 rounded-lg transition-all"
																		aria-label="2秒戻る"
																	>
																		<svg
																			xmlns="http://www.w3.org/2000/svg"
																			width="28"
																			height="28"
																			viewBox="0 0 24 24"
																			fill="none"
																			stroke="currentColor"
																			strokeWidth="2"
																			strokeLinecap="round"
																			strokeLinejoin="round"
																		>
																			<path d="m12 8-4 4 4 4" />
																		</svg>
																	</button>
																	<button
																		type="button"
																		onClick={() => {
																			const audio = document.getElementById(
																				`audio-${index}`,
																			) as HTMLAudioElement;
																			if (audio) {
																				audio.currentTime = Math.min(
																					audio.duration,
																					audio.currentTime + 2,
																				);
																			}
																		}}
																		className="p-2 text-gray-300 hover:text-white dark:text-gray-300 dark:hover:text-white bg-[#2c2c2c] dark:bg-gray-900 hover:bg-[#444444] dark:hover:bg-gray-800 rounded-lg transition-all"
																		aria-label="2秒進む"
																	>
																		<svg
																			xmlns="http://www.w3.org/2000/svg"
																			width="28"
																			height="28"
																			viewBox="0 0 24 24"
																			fill="none"
																			stroke="currentColor"
																			strokeWidth="2"
																			strokeLinecap="round"
																			strokeLinejoin="round"
																		>
																			<path d="m12 16 4-4-4-4" />
																		</svg>
																	</button>
																</div>
																<audio
																	id={`audio-${index}`}
																	controls
																	className="flex-1"
																	src={actionData.audioContents[index]}
																>
																	<track kind="captions" />
																</audio>
															</div>
														)}
													</div>
												))
											) : (
												<p className="text-sm text-gray-500 dark:text-gray-400">
													データがありません
												</p>
											)}
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
											<p className="ml-4">
												トークン数: {actionData.totalTokens}
											</p>
											<p className="ml-4">
												トークン数の見積: {actionData.countTotalTokens}
											</p>
											<p className="ml-4">
												終了理由: {actionData.finishReason}
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
