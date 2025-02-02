import { Timestamp } from "@google-cloud/firestore";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { Header } from "../components/Header";
import { handleError, processWebContent } from "../function";
import { saveContent } from "../function/firebase";
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
		const userId = "100";

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
		await saveContent(content, contentId, userId);

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
	const navigation = useNavigation();
	const isProcessing = navigation.state === "submitting";

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			<Header />

			<main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
				<div className="space-y-4">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
						<Form method="post" className="space-y-4">
							<div>
								<label
									htmlFor="url"
									className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1"
								>
									URL
								</label>
								<input
									type="url"
									name="url"
									id="url"
									required
									className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
											bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
									placeholder="https://example.com"
								/>
							</div>

							<div className="flex justify-end">
								<button
									type="submit"
									disabled={isProcessing}
									className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
										isProcessing
											? "bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-400 cursor-not-allowed"
											: "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200"
									}`}
								>
									{isProcessing ? "Processing..." : "Save"}
								</button>
							</div>
						</Form>
					</div>

					{/* 結果表示部分 */}
					{actionData && (
						<div className="space-y-3">
							{actionData.contents && actionData.contents.body.length > 0 ? (
								actionData.contents.body.map((pair, index) => (
									<div
										key={pair.en.slice(0, 20)}
										className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm"
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
													controls
													className="w-full h-8"
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
					)}
				</div>
			</main>
		</div>
	);
}
