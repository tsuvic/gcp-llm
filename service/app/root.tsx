import { ManifestLink } from "@remix-pwa/sw";
import type { LinksFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
	Form,
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
} from "@remix-run/react";
import { useEffect, useState } from "react";
import { authenticator } from "./services/auth.server";
import type { Session } from "./services/auth.server";

import "./tailwind.css";

export const links: LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
	},
	// { rel: "manifest", href: "/manifest.json" },
	{ rel: "manifest", href: "/manifest.webmanifest" },
	// { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

export const loader: LoaderFunction = async ({ request }) => {
	const session = await authenticator.isAuthenticated(request);

	const url = new URL(request.url);
	if (!session && url.pathname !== "/login") {
		throw redirect("/login");
	}

	return session;
};

function Layout() {
	const session = useLoaderData<Session>();
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	// メニュー以外をクリックした時の処理を追加
	useEffect(() => {
		const closeMenu = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (!target.closest(".user-menu")) {
				setIsMenuOpen(false);
			}
		};

		document.addEventListener("click", closeMenu);
		return () => document.removeEventListener("click", closeMenu);
	}, []);

	return (
		<div className="flex flex-col min-h-screen overflow-x-hidden bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
			<header className="bg-white dark:bg-gray-800 shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-20">
						<Link to="/" className="group">
							<div className="flex items-center">
								<div className="flex items-center gap-2">
									<div className="text-3xl font-black bg-gradient-to-br from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent transform -rotate-12">
										A
									</div>
									<span className="text-xl font-bold text-gray-900 dark:text-gray-100">
										rticlePlay
									</span>
								</div>
							</div>
							<p className="mt-0.5 text-xs italic text-gray-600 dark:text-gray-400 ml-10">
								Love what you do, and you&apos;ll excel at it.
							</p>
						</Link>

						{session && (
							<div className="relative user-menu">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setIsMenuOpen(!isMenuOpen);
									}}
									className="flex items-center focus:outline-none"
								>
									<img
										src={session.avatarUrl}
										alt={session.name}
										className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-700"
									/>
								</button>

								{isMenuOpen && (
									<div className="absolute right-0 mt-3 w-49 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 border border-gray-200 dark:border-gray-700 z-50">
										<div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
											<p className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">
												{session.name}
											</p>
											<p className="text-xs text-gray-400 dark:text-gray-200 mb-1">
												@{session.userId}
											</p>
										</div>
										<Form action="/logout" method="post">
											<button
												type="submit"
												className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
											>
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<title>ログアウト</title>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
													/>
												</svg>
												ログアウト
											</button>
										</Form>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</header>

			<main className="flex-1 overflow-x-hidden">
				<Outlet />
			</main>
		</div>
	);
}

export default function App() {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<ManifestLink />
				<Links />
			</head>
			<body>
				<Layout />
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}
