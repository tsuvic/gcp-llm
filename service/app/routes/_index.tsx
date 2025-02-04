import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Link, redirect, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { getContents } from "../function/firebase";
import { getSessionUser } from "../services/session.server";
import type { ContentGetCollection } from "../types";
import { toJSTString } from "../utils/date";

export const meta: MetaFunction = () => {
	return [{ title: "ARTICLEPLAY - コンテンツ一覧" }];
};

// Loader 関数を追加して Firestore からデータを取得
export const loader: LoaderFunction = async ({ request }) => {
	const session = await getSessionUser(request);
	if (!session) {
		throw redirect("/login");
	}
	const contents = await getContents(session.tenantId);
	return {
		contents: contents,
		dates: contents.map((content) => toJSTString(content.createdAt.toDate())),
	};
};

export default function Index() {
	const { contents, dates } = useLoaderData<{
		contents: ContentGetCollection[];
		dates: string[];
	}>();
	const [titleFilter, setTitleFilter] = useState("");
	const [urlFilter, setUrlFilter] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [activeFilter, setActiveFilter] = useState<
		"title" | "url" | "date" | null
	>(null);

	// トグル機能を追加
	const toggleFilter = (filter: "title" | "url" | "date") => {
		setActiveFilter((current) => (current === filter ? null : filter));
	};

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
		<div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			<main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
				{/* PC表示用フィルター */}
				<div className="hidden md:flex items-start mb-6">
					<div className="w-full grid grid-cols-12 gap-4">
						<Link
							to="/save"
							className="col-span-2 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center flex items-center justify-center text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
						>
							Create Article
						</Link>
						<input
							type="text"
							placeholder="Search by title..."
							value={titleFilter}
							onChange={(e) => setTitleFilter(e.target.value)}
							className="col-span-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
									bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
						/>
						<input
							type="text"
							placeholder="Search by URL..."
							value={urlFilter}
							onChange={(e) => setUrlFilter(e.target.value)}
							className="col-span-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
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
				<div className="md:hidden space-y-3 mb-6">
					<div className="grid grid-cols-5 gap-2">
						<Link
							to="/save"
							className="col-span-2 h-9 bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900 text-center flex items-center justify-center text-xs font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-300 transition-all"
						>
							Create
						</Link>
						<button
							type="button"
							onClick={() => toggleFilter("title")}
							className={`h-9 text-xs rounded-lg transition-colors ${
								activeFilter === "title"
									? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
									: "bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-200"
							}`}
						>
							Title
						</button>
						<button
							type="button"
							onClick={() => toggleFilter("url")}
							className={`h-9 text-xs rounded-lg transition-colors ${
								activeFilter === "url"
									? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
									: "bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-200"
							}`}
						>
							URL
						</button>
						<button
							type="button"
							onClick={() => toggleFilter("date")}
							className={`h-9 text-xs rounded-lg transition-colors ${
								activeFilter === "date"
									? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
									: "bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-200"
							}`}
						>
							Date
						</button>
					</div>

					{activeFilter === "title" && (
						<input
							type="text"
							placeholder="Search by title..."
							value={titleFilter}
							onChange={(e) => setTitleFilter(e.target.value)}
							className="w-full h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
									bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
						/>
					)}
					{activeFilter === "url" && (
						<input
							type="text"
							placeholder="Search by URL..."
							value={urlFilter}
							onChange={(e) => setUrlFilter(e.target.value)}
							className="w-full h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
									bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
						/>
					)}
					{activeFilter === "date" && (
						<div className="flex gap-2">
							<input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
										bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
								placeholder="Start date"
							/>
							<input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
										bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
								placeholder="End date"
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
							className="block h-16 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 hover:border-blue-100 dark:hover:border-blue-900 relative overflow-hidden group"
						>
							<div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:from-blue-50 dark:group-hover:from-blue-900/20 transition-all" />
							<div className="flex h-full p-4 items-center relative">
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
