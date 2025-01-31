import {
	HarmBlockThreshold,
	HarmCategory,
	VertexAI,
} from "@google-cloud/vertexai";
import {
	type ActionFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";

export const meta: MetaFunction = () => {
	return [
		{ title: "New Remix App" },
		{ name: "description", content: "Welcome to Remix!" },
	];
};

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	console.log(formData);

	if (!process.env.GCP_PROJECT_ID) {
		throw new Error("GCP_PROJECT_ID is not set");
	}

	const project = process.env.GCP_PROJECT_ID;
	const location = "asia-northeast1";
	const vertexAI = new VertexAI({ project, location });

	const generativeMode = vertexAI.getGenerativeModel({
		model: "gemini-1.5-flash-002",
		safetySettings: [
			{
				category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
				threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
			},
		],
		generationConfig: {
			maxOutputTokens: 100,
			temperature: 0.5,
			topP: 0.95,
		},
		systemInstruction: {
			role: "system",
			parts: [{ text: "You are a helpful assistant." }],
		},
	});

	const req = {
		contents: [{ role: "user", parts: [{ text: "say hi" }] }],
	};

	const result = await generativeMode.generateContent(req);
	const res = await result.response;
	console.log(JSON.stringify(res, null, 2));

	return json({
		message: "リクエストが送信されました",
		response: res.candidates?.[0]?.content?.parts?.[0]?.text,
	});
}

export default function Index() {
	const actionData = useActionData<typeof action>();

	return (
		<div className="flex h-screen items-center justify-center">
			<div className="flex flex-col items-center gap-8">
				<h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
					Gemini API
				</h1>
				<Form method="post">
					<button
						type="submit"
						className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					>
						リクエストを送信
					</button>
				</Form>
				{actionData && (
					<div className="mt-4 w-96 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
						<h2 className="mb-2 text-lg font-semibold text-gray-800 dark:text-gray-100">
							レスポンス
						</h2>
						<p className="text-gray-700 dark:text-gray-300">
							{actionData.response}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
