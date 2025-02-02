import { Timestamp } from "@google-cloud/firestore";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { handleError, processWebContent } from "../function";
import type { ContentSetCollection } from "../types";

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
		const contentId = `${Date.now()}`;
		const userId = 100;

		if (!url) {
			console.error("URLが指定されていません");
			return {
				status: "error",
				message: "エラー",
				error: "URLを入力してください",
			};
		}

		console.log("処理開始:", {
			url: url.toString(),
			contentId,
			timestamp: new Date().toISOString(),
		});

		const result = await processWebContent(url.toString(), contentId, userId);
		const audioContents: string[] = [];

		console.log("処理完了:", {
			url: url.toString(),
			contentId,
			processingTime: `${result.processingTime.toFixed(2)}ミリ秒`,
			finishReason: result.finishReason,
			totalTokens: result.totalTokens,
			timestamp: new Date().toISOString(),
		});

		const content: ContentSetCollection = {
			url: url.toString(),
			audioCount: result.contents.body.length,
			title: result.contents.title,
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now(),
			status: "completed",
		};
		await saveContent(content);

		return {
			status: "success",
			message: "リクエストが正常に処理されました",
			contents: result.contents,
			processingTime: `${result.processingTime.toFixed(2)}ミリ秒`,
			finishReason: result.finishReason,
			countTotalTokens: result.countTotalTokens,
			totalTokens: result.totalTokens,
			audioContents,
		};
	} catch (error) {
		return handleError(error);
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
									"Save"
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
											{actionData.contents &&
											actionData.contents.body.length > 0 ? (
												actionData.contents.body.map((pair, index) => (
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
																			<title>2秒戻る</title>
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
																			<title>2秒進む</title>
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
