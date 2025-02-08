import { PubSub } from "@google-cloud/pubsub";
import type { WorkerActionArgs } from "@remix-pwa/sw";
import { type ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { getSessionUser } from "../services/session.server";
import { logger } from "../utils/logger";

// entry.worker.tsで共通のワーカーも定義できるし、Route用に定義することもできる
// TODO: share target でPWAを開かずにブラウザに留める仕組みにしたい
export async function workerAction({ context }: WorkerActionArgs) {
	try {
		// オリジナルのリクエストをサーバーに送信
		const response = await context.fetchFromServer();

		if (response.ok) {
			// 成功した場合、ユーザーフレンドリーなページを表示
			return new Response(
				`
				<html>
					<head>
						<title>共有完了</title>
						<meta charset="utf-8">
						<meta name="viewport" content="width=device-width, initial-scale=1">
						<style>
							body { 
								font-family: sans-serif;
								display: flex;
								align-items: center;
								justify-content: center;
								min-height: 100vh;
								margin: 0;
								background: #f5f5f5;
							}
							.message {
								text-align: center;
								padding: 2rem;
								background: white;
								border-radius: 8px;
								box-shadow: 0 2px 4px rgba(0,0,0,0.1);
							}
						</style>
					</head>
					<body>
						<div class="message">
							<h1>共有が完了しました</h1>
							<p>このページは自動的に閉じられます</p>
						</div>
						<script>
							setTimeout(() => {
								window.close();
							}, 2000);
						</script>
					</body>
				</html>
			`,
				{
					headers: {
						"Content-Type": "text/html;charset=utf-8",
					},
				},
			);
		}

		return response;
	} catch (error) {
		console.error("Worker APIエラー", error);
		return json({ error: "共有処理中にエラーが発生しました" }, { status: 500 });
	}
}

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

		// リファラーをチェック
		const referer = request.headers.get("referer");

		if (referer) {
			// 元のページに戻る（成功フラグ付きで）
			return redirect(
				`${referer}${referer.includes("?") ? "&" : "?"}shared=true`,
				{ status: 303 },
			);
		}

		// リファラーがない場合はホームページに戻る（成功フラグ付きで）
		// The POST request is then ideally replied with an HTTP 303 See Other redirect to avoid multiple POST requests from being submitted if a page refresh was initiated by the user, for example.
		// https://developer.mozilla.org/en-US/docs/Web/Manifest/Reference/share_target#receiving_share_data_using_post
		return redirect("/?shared=true", { status: 303 });
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
