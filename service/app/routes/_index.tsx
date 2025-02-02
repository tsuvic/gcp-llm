import { Timestamp } from "@google-cloud/firestore";
import type {
	ActionFunctionArgs,
	LoaderFunction,
	MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
	useNavigation,
} from "@remix-run/react";
import { useState } from "react";
import { Header } from "~/components/Header";
import { handleError, processWebContent } from "../function";
import { db, getContents } from "../function/firebase";
import { saveContent } from "../function/firebase";
import type { ContentSetCollection } from "../types";

export const meta: MetaFunction = () => {
	return [{ title: "ARTICLEPLAY - コンテンツ一覧" }];
};

// Loader 関数を追加して Firestore からデータを取得
export const loader: LoaderFunction = async () => {
	const userId = "100"; // 実際のユーザーIDを取得する方法に置き換えてください
	const contents = await getContents(userId);
	return {
		contents: contents,
		dates: contents.map((content) =>
			content.createdAt.toDate().toLocaleString(),
		),
	};
};

export default function Index() {
	const { contents, dates } = useLoaderData<typeof loader>();
	const [titleFilter, setTitleFilter] = useState("");
	const [urlFilter, setUrlFilter] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [activeFilter, setActiveFilter] = useState<
		"title" | "url" | "date" | null
	>(null);

	const filteredContents = contents.filter((content, index) => {
		const matchesTitle = content.title
			.toLowerCase()
			.includes(titleFilter.toLowerCase());
		const matchesUrl = content.url
			.toLowerCase()
			.includes(urlFilter.toLowerCase());
		const date = new Date(dates[index]);
		const matchesDate =
			(!startDate || date >= new Date(startDate)) &&
			(!endDate || date <= new Date(endDate));
		return matchesTitle && matchesUrl && matchesDate;
	});

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<Header />

			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* PC表示用フィルター */}
				<div className="hidden md:flex items-start mb-8 gap-4">
					<Link
						to="/save"
						className="w-32 h-10 bg-blue-600 text-white text-center flex items-center justify-center text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
					>
						新規作成
					</Link>
					<div className="flex-1 grid grid-cols-12 gap-4">
						<input
							type="text"
							placeholder="タイトルで検索"
							value={titleFilter}
							onChange={(e) => setTitleFilter(e.target.value)}
							className="col-span-3 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
									bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
						/>
						<input
							type="text"
							placeholder="URLで検索"
							value={urlFilter}
							onChange={(e) => setUrlFilter(e.target.value)}
							className="col-span-3 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
									bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
						/>
						<div className="col-span-6 flex gap-2">
							<input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
										bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
							/>
							<input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
										bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
							/>
						</div>
					</div>
				</div>

				{/* スマホ表示用フィルター */}
				<div className="md:hidden space-y-4 mb-8">
					<Link
						to="/save"
						className="block w-full h-10 bg-blue-600 text-white text-center flex items-center justify-center text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
					>
						新規作成
					</Link>
					<div className="flex gap-2">
						<button
							onClick={() => setActiveFilter("title")}
							className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
								activeFilter === "title"
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
							}`}
						>
							タイトル
						</button>
						<button
							onClick={() => setActiveFilter("url")}
							className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
								activeFilter === "url"
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
							}`}
						>
							URL
						</button>
						<button
							onClick={() => setActiveFilter("date")}
							className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
								activeFilter === "date"
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
							}`}
						>
							日付
						</button>
					</div>

					{activeFilter === "title" && (
						<input
							type="text"
							placeholder="タイトルで検索"
							value={titleFilter}
							onChange={(e) => setTitleFilter(e.target.value)}
							className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
									bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
						/>
					)}
					{activeFilter === "url" && (
						<input
							type="text"
							placeholder="URLで検索"
							value={urlFilter}
							onChange={(e) => setUrlFilter(e.target.value)}
							className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
									bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
						/>
					)}
					{activeFilter === "date" && (
						<div className="flex gap-2">
							<input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
										bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
							/>
							<input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
										bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
							/>
						</div>
					)}
				</div>

				{/* コンテンツ一覧 */}
				<div className="space-y-3">
					{filteredContents.map((content, index) => (
						<Link
							key={content.url}
							to={`/contents/${content.contentId}`}
							className="block h-16 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
						>
							<div className="flex h-full p-4 items-center">
								{/* PC表示用レイアウト */}
								<div className="hidden md:block flex-1 min-w-0">
									<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
										{content.title}
									</h2>
									<p className="text-sm text-gray-600 dark:text-gray-400 truncate">
										{content.url}
									</p>
								</div>
								<div className="hidden md:block ml-4">
									<span className="text-sm text-gray-700 dark:text-gray-300">
										{dates[index]}
									</span>
								</div>

								{/* スマホ表示用レイアウト */}
								<div className="md:hidden w-full">
									<h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
										{content.title}
									</h2>
									<p className="text-xs text-gray-500 dark:text-gray-500 truncate">
										{content.url}
									</p>
									<p className="text-xs text-right text-gray-600 dark:text-gray-400">
										{dates[index]}
									</p>
								</div>
							</div>
						</Link>
					))}
				</div>
			</main>
		</div>
	);
}
