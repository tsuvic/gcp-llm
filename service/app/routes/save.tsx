import { CloudTasksClient } from "@google-cloud/tasks";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, redirect, useActionData, useNavigation } from "@remix-run/react";
import { useEffect, useState } from "react";
import { handleError } from "../function";
import { getSessionUser } from "../services/session.server";
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
	if (!process.env.GCP_PROJECT_ID) {
		throw new Error("GCP_PROJECT_ID is not set");
	}
	if (!process.env.GCP_LOCATION) {
		throw new Error("GCP_LOCATION is not set");
	}
	if (!process.env.GCP_QUEUE) {
		throw new Error("GCP_QUEUE is not set");
	}
	const session = await getSessionUser(request);
	if (!session) {
		throw redirect("/login");
	}
	const formData = await request.formData();
	const url = formData.get("url");
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

	const client = new CloudTasksClient();
	const parent = client.queuePath(
		process.env.GCP_PROJECT_ID,
		process.env.GCP_LOCATION,
		process.env.GCP_QUEUE,
	);

	const task = {
		httpRequest: {
			httpMethod: "POST" as const,
			url: url?.toString(),
			body: Buffer.from(
				JSON.stringify({
					url: url?.toString(),
					tenantId: session.tenantId,
				}),
			).toString("base64"),
			headers: {
				"Content-Type": "application/json",
			},
		},
	};

	const [response] = await client.createTask({ parent, task });
	logger.info(`Created task ${response.name}`);

	// 一時的なレスポンス
	return {
		status: "success",
		message: "タスクをキューに追加しました",
		taskName: response.name,
	};

	// try {
	// 	const formData = await request.formData();
	// 	const url = formData.get("url");
	// 	const session = await getSessionUser(request);
	// 	if (!session) {
	// 		throw redirect("/login");
	// 	}

	// 	if (!url) {
	// 		logger.error({
	// 			message: "URLが指定されていません",
	// 			url,
	// 			timestamp: new Date().toISOString(),
	// 		});
	// 		return {
	// 			status: "error",
	// 			message: "エラー",
	// 			error: "URLを入力してください",
	// 		};
	// 	}

	// 以下の処理はコメントアウト
	/*
		const result = await createContent(url.toString(), session.tenantId);

		const now = new Date();
		const content: ContentSetCollection = {
			url: url.toString(),
			audioCount: result.contents.body.length,
			title: result.contents.title,
			createdAt: Timestamp.fromDate(now),
			updatedAt: Timestamp.fromDate(now),
			status: "completed",
		};
		await saveContent(content, session.tenantId, result.contentId);

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
		*/
	// } catch (error) {
	// 	return handleError(error);
	// }
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
		<div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			<main className="max-w-7xl mx-auto px-2 sm:px-4 py-2">
				<div className="space-y-3">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm px-3 py-2">
						<Form method="post" className="space-y-2">
							<input
								type="url"
								name="url"
								id="url"
								required
								disabled={isSuccess}
								className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
										bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
										disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
								placeholder="https://example.com"
							/>
							<div className="">
								<button
									type="submit"
									disabled={isProcessing || isSuccess}
									className={`w-full px-2 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2
										${
											isSuccess
												? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-not-allowed"
												: isProcessing
													? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
													: "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
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
												<title>Processing</title>
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
											<span className="sr-only">Processing...</span>
										</>
									) : isSuccess ? (
										"Saved"
									) : (
										"Save"
									)}
								</button>
							</div>
						</Form>
					</div>

					{actionData && (
						<div className="space-y-2">
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
