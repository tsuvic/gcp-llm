import { PubSub } from "@google-cloud/pubsub";
import { type ActionFunctionArgs, redirect } from "@remix-run/node";
import { getSessionUser } from "../services/session.server";
import { logger } from "../utils/logger";

export async function action({ request }: ActionFunctionArgs) {
	if (!process.env.GCP_PROJECT_ID) {
		throw new Error("GCP_PROJECT_ID is not set");
	}
	if (!process.env.PUBSUB_TOPIC) {
		throw new Error("PUBSUB_TOPIC is not set");
	}

	try {
		const formData = await request.formData();
		const url = formData.get("url");
		const text = formData.get("text");
		const title = formData.get("title");

		const session = await getSessionUser(request);
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
				formData: { url, text, title },
				timestamp: new Date().toISOString(),
			});
			return new Response("URLが必要です", { status: 400 });
		}

		const pubsub = new PubSub();
		const topic = pubsub.topic(process.env.PUBSUB_TOPIC);

		const messageData = {
			url: targetUrl,
			tenantId: session.tenantId,
		};

		const messageBuffer = Buffer.from(JSON.stringify(messageData));
		const messageId = await topic.publish(messageBuffer);

		logger.info({
			message: "メッセージを送信しました",
			messageId,
			data: messageData,
		});

		return new Response(JSON.stringify({ status: "success" }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
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
		});
	}
}
