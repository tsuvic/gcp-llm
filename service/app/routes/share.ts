import type { ActionFunctionArgs } from "@remix-run/node";
import { createContent } from "../function";
import { logger } from "../utils/logger";

export async function action({ request }: ActionFunctionArgs) {
	try {
		const formData = await request.formData();
		const url = formData.get("fileUri");
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

		const result = await createContent(url.toString(), userId);

		return new Response(JSON.stringify({ contentId: result.contentId }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (error) {
		logger.error({
			message: "APIエラー",
			error,
			timestamp: new Date().toISOString(),
		});

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
