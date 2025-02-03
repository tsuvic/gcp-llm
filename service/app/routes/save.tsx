import { Timestamp } from "@google-cloud/firestore";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { createContent, handleError } from "../function";
import { saveContent } from "../function/firebase";
import type { ContentSetCollection } from "../types";
import { toJSTDate } from "../utils/date";
import { logger } from "../utils/logger";

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
		const url = formData.get("url");
		const userId = "100";

		if (!url) {
			logger.error({
				message: "URLが指定されていません",
				url,
				timestamp: new Date().toISOString(),
			});
			return {
				status: "error",
				message: "エラー",
				error: "URLを入力してください",
			};
		}

		const result = await createContent(url.toString(), userId);

		const now = toJSTDate(new Date());
		const content: ContentSetCollection = {
			url: url.toString(),
			audioCount: result.contents.body.length,
			title: result.contents.title,
			createdAt: Timestamp.fromDate(now),
			updatedAt: Timestamp.fromDate(now),
			status: "completed",
		};
		await saveContent(content, userId, result.contentId);

		return {
			status: "success",
			message: "リクエストが正常に処理されました",
			contents: result.contents,
			contentId: result.contentId,
			processingTime: `${result.processingTime.toFixed(2)}ミリ秒`,
			finishReason: result.finishReason,
			countTotalTokens: result.countTotalTokens,
			totalTokens: result.totalTokens,
			audioContents: result.audioContents.map(
				(audio) => `data:audio/mp3;base64,${audio}`,
			),
		};
	} catch (error) {
		return handleError(error);
	}
}

export default function Index() {
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const isProcessing = navigation.state === "submitting";
	const [isSuccess, setIsSuccess] = useState(false);

	useEffect(() => {
		if (actionData?.status === "success") {
			setIsSuccess(true);
		}
	}, [actionData]);

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			<Header />

			<main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
				<div className="space-y-4">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
						<Form method="post" className="space-y-6">
							<div className="relative">
								<input
									type="url"
									name="url"
									id="url"
									required
									disabled={isSuccess}
									className="w-full px-4 py-3 text-base rounded-xl border-2 border-gray-200 dark:border-gray-700 
											bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
											disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
											focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900
											transition-all outline-none"
									placeholder="https://example.com"
								/>
								{isSuccess && (
									<div className="absolute right-3 top-1/2 -translate-y-1/2">
										<svg
											className="w-5 h-5 text-green-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M5 13l4 4L19 7"
											/>
										</svg>
									</div>
								)}
							</div>

							<div className="flex justify-end">
								<button
									type="submit"
									disabled={isProcessing || isSuccess}
									className={`px-6 py-3 text-sm font-medium rounded-xl transition-all flex items-center gap-2 
										${
											isSuccess
												? "bg-green-600 text-white cursor-not-allowed"
												: isProcessing
													? "bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 cursor-not-allowed"
													: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm hover:shadow-md"
										}`}
								>
									{isProcessing ? (
										<>
											<svg
												className="animate-spin h-4 w-4"
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
												/>
												<path
													className="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												/>
											</svg>
											Processing...
										</>
									) : isSuccess ? (
										<>
											<svg
												className="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M5 13l4 4L19 7"
												/>
											</svg>
											Converted
										</>
									) : (
										<>
											<svg
												className="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
												/>
											</svg>
											Save
										</>
									)}
								</button>
							</div>
						</Form>
					</div>

					{actionData && (
						<div className="space-y-3">
							{actionData.contents && actionData.contents.body.length > 0 ? (
								actionData.contents.body.map((pair, index) => (
									<div
										key={pair.en.slice(0, 20)}
										className="p-1 sm:p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm"
									>
										<p className="text-sm leading-relaxed text-gray-900 dark:text-gray-100 mb-1 px-1">
											{pair.en}
										</p>
										<p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 mb-1 px-1">
											{pair.ja}
										</p>
										{actionData.audioContents?.[index] && (
											<div className="space-y-2">
												<audio
													id={`audio-${index}`}
													controls
													className="w-full h-8"
													src={actionData.audioContents[index]}
												>
													<track kind="captions" />
												</audio>
												<div className="flex gap-1">
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
														className="flex-1 py-1.5 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
													>
														<svg
															className="w-4 h-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<title>Previous</title>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
															/>
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
														className="flex-1 py-1.5 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
													>
														<svg
															className="w-4 h-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<title>Next</title>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M13 5l7 7-7 7M5 5l7 7-7 7"
															/>
														</svg>
													</button>
												</div>
											</div>
										)}
									</div>
								))
							) : (
								<p className="text-sm text-gray-500 dark:text-gray-400">
									処理ができないコンテンツです。他のコンテンツを対象にしてください。
								</p>
							)}
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
