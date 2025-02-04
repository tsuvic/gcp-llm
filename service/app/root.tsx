import type { LinksFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
} from "@remix-run/react";
import { Form } from "@remix-run/react";
import { useState } from "react";
import { authenticator } from "./services/auth.server";
import type { User } from "./services/auth.server";
import { getSessionUser } from "./services/session.server";

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
	// { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

export const loader: LoaderFunction = async ({ request }) => {
	const user = await authenticator.isAuthenticated(request);

	const url = new URL(request.url);
	if (!user && url.pathname !== "/login") {
		throw redirect("/login");
	}

	return user;
};

function Layout() {
	const user = useLoaderData<User>();
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
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
										ARTICLEPLAY
									</span>
								</div>
							</div>
							<p className="mt-0.5 text-xs italic text-gray-600 dark:text-gray-400 ml-10">
								Love what you do, and you&apos;ll excel at it.
							</p>
						</Link>

						{user && (
							<div className="relative">
								<button
									type="button"
									onClick={() => setIsMenuOpen(!isMenuOpen)}
									className="flex items-center focus:outline-none"
								>
									<img
										src={user.avatarUrl}
										alt={user.name}
										className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-700"
									/>
								</button>

								{isMenuOpen && (
									<div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 border border-gray-200 dark:border-gray-700">
										<div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
											<p className="text-sm font-medium text-gray-900 dark:text-gray-100">
												{user.name}
											</p>
										</div>
										<Form action="/logout" method="post">
											<button
												type="submit"
												className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
											>
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

			<Outlet />
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
