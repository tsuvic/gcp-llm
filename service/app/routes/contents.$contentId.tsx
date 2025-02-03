import { Storage } from "@google-cloud/storage";
import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { ContentGetCollection, Contents } from "~/types";
import { Header } from "../components/Header";
import { getContent } from "../function/firebase";

const storage = new Storage();
const bucketName = process.env.GCP_STORAGE_BUCKET || "";

export const meta: MetaFunction = () => {
	return [{ title: "ARTICLEPLAY - コンテンツ詳細" }];
};

type LoaderData = {
	content: ContentGetCollection;
	transcript: Contents;
	audioContents: string[];
};

export const loader: LoaderFunction = async ({ params }) => {
	const userId = "100";
	const contentId = params.contentId;
	if (!contentId) throw new Error("Content ID is required");

	const content = await getContent(userId, contentId);
	if (!content) throw new Error("Content not found");

	const bucket = storage.bucket(bucketName);
	const transcriptFile = bucket.file(`text/${userId}/${contentId}.json`);
	const [transcriptExists] = await transcriptFile.exists();

	let transcript: Contents;
	if (transcriptExists) {
		const [transcriptContent] = await transcriptFile.download();
		const transcriptData = JSON.parse(transcriptContent.toString());
		transcript = transcriptData.result
			? JSON.parse(transcriptData.result)
			: null;
	} else {
		throw new Error("Transcript not found");
	}

	// 音声ファイルをダウンロード
	const audioContents = await Promise.all(
		Array.from({ length: content.audioCount }, async (_, i) => {
			const audioFile = bucket.file(
				`audio/${userId}/${contentId}-${i + 1}.mp3`,
			);
			const [buffer] = await audioFile.download();
			return `data:audio/mp3;base64,${buffer.toString("base64")}`;
		}),
	);

	return { content, transcript, audioContents };
};

export default function ContentDetail() {
	const { content, transcript, audioContents } = useLoaderData<LoaderData>();

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			<Header />

			<main className="max-w-5xl mx-auto px-2 sm:px-4 py-4">
				<div className="flex flex-col items-center mb-2">
					<a
						href={content.url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-md font-bold text-gray-900 dark:text-gray-300 mb-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
					>
						{content.title}
					</a>
				</div>

				<div className="space-y-3">
					{transcript.body.map((pair, index) => (
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
							{audioContents[index] && (
								<div className="space-y-2">
									<audio
										id={`audio-${index}`}
										controls
										className="w-full h-8"
										src={audioContents[index]}
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
					))}
				</div>
			</main>
		</div>
	);
}
