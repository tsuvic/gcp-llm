import { Timestamp } from "@google-cloud/firestore";
import { type ActionFunctionArgs, redirect } from "@remix-run/node";
import type { ContentSetCollection } from "~/types";
import { createContent } from "../function";
import { saveContent } from "../function/firebase";
import { getSessionUser as getSession } from "../services/session.server";
import { logger } from "../utils/logger";

export async function action({ request }: ActionFunctionArgs) {
	try {
		const formData = await request.formData();
		const url = formData.get("url");
		const text = formData.get("text");
		const title = formData.get("title");
		logger.info({
			message: "share実行",
			url,
			text,
			title,
		});

		const session = await getSession(request);
		if (!session) {
			throw redirect("/login");
		}

		let targetUrl = url?.toString();
		if (!targetUrl && text) {
			const urlRegex = /(https?:\/\/[^\s]+)/;
			const match = text.toString().match(urlRegex);
			if (match) {
				targetUrl = match[0];
			}
		}

		if (!targetUrl) {
			logger.error({
				message: "URLが見つかりません",
				formData: {
					url,
					text,
					title,
				},
				timestamp: new Date().toISOString(),
			});
			return new Response("URLが必要です", {
				status: 400,
				headers: {
					"Content-Type": "application/json",
				},
			});
		}

		const result = await createContent(targetUrl, session.tenantId);
		const now = new Date();
		const content: ContentSetCollection = {
			url: targetUrl.toString(),
			audioCount: result.contents.body.length,
			title: result.contents.title,
			createdAt: Timestamp.fromDate(now),
			updatedAt: Timestamp.fromDate(now),
			status: "completed",
		};
		await saveContent(content, session.tenantId, result.contentId);

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
