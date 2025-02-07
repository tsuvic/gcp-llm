import { PubSub } from "@google-cloud/pubsub";
import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/react";
import { getSessionUser } from "../services/session.server";
import { logger } from "../utils/logger";

export async function action({ request }: ActionFunctionArgs) {
	const gcpProjectId = process.env.GCP_PROJECT_ID;
	if (!gcpProjectId) {
		throw new Error("GCP_PROJECT_ID is not set");
	}
	const pubsubTopic = process.env.PUBSUB_TOPIC;
	if (!pubsubTopic) {
		throw new Error("PUBSUB_TOPIC is not set");
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

	const pubsub = new PubSub();
	const topic = pubsub.topic(pubsubTopic);

	const messageData = {
		url: url.toString(),
		tenantId: session.tenantId,
	};

	const messageBuffer = Buffer.from(JSON.stringify(messageData));
	const messageId = await topic.publishMessage({
		data: messageBuffer,
	});

	logger.info({
		message: "メッセージを送信しました",
		messageId,
		data: messageData,
	});

	return {
		status: "success",
		message: "メッセージをキューに追加しました",
		messageId,
	};
}
