import { Storage } from "@google-cloud/storage";
import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
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
		console.log(transcriptData);
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
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<Header />

			<main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
					{content.title}
				</h1>

				<div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4">
					<div className="flex-1 flex flex-col overflow-hidden">
						<div className="flex-1 overflow-y-auto">
							{transcript.body.map((pair, index) => (
								<div
									key={pair.en.slice(0, 20)}
									className="mb-6 last:mb-0 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
								>
									<p className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
										{pair.en}
									</p>
									<p className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
										{pair.ja}
									</p>
									{audioContents[index] && (
										<div className="flex items-center gap-4 bg-[#2c2c2c] dark:bg-gray-900 rounded-lg p-2">
											<div className="flex items-center gap-2">
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
													className="p-2 text-gray-300 hover:text-white dark:text-gray-300 dark:hover:text-white bg-[#2c2c2c] dark:bg-gray-900 hover:bg-[#444444] dark:hover:bg-gray-800 rounded-lg transition-all"
													aria-label="2秒戻る"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="28"
														height="28"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													>
														<title>2秒戻る</title>
														<path d="m12 8-4 4 4 4" />
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
													className="p-2 text-gray-300 hover:text-white dark:text-gray-300 dark:hover:text-white bg-[#2c2c2c] dark:bg-gray-900 hover:bg-[#444444] dark:hover:bg-gray-800 rounded-lg transition-all"
													aria-label="2秒進む"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="28"
														height="28"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													>
														<title>2秒進む</title>
														<path d="m12 16 4-4-4-4" />
													</svg>
												</button>
											</div>
											<audio
												id={`audio-${index}`}
												controls
												className="flex-1"
												src={audioContents[index]}
											>
												<track kind="captions" />
											</audio>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
