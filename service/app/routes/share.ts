import type { ActionFunctionArgs } from "@remix-run/node";
import { processWebContent } from "../function";

export async function action({ request }: ActionFunctionArgs) {
	try {
		const formData = await request.formData();
		const url = formData.get("fileUri");
		const contentId = `${Date.now()}`;
		const userId = "100";

		if (!url) {
			console.error("URLが指定されていません");
			return new Response("URLが必要です", {
				status: 400,
				headers: {
					"Content-Type": "application/json",
				},
			});
		}

		console.log("処理開始:", {
			url: url.toString(),
			contentId,
			timestamp: new Date().toISOString(),
		});

		const result = await processWebContent(url.toString(), contentId, userId);

		console.log("処理完了:", {
			url: url.toString(),
			contentId,
			processingTime: `${result.processingTime.toFixed(2)}ミリ秒`,
			finishReason: result.finishReason,
			totalTokens: result.totalTokens,
			timestamp: new Date().toISOString(),
		});

		return new Response(JSON.stringify({ contentId }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (error) {
		console.error("APIエラー:", error);

		const errorMessage =
			error instanceof Error ? error.message : "不明なエラーが発生しました";

		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}
}
