import { Form, Link, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import type { User } from "../services/auth.server";

export function Header() {
	const user = useLoaderData<User>();
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<header className="bg-white dark:bg-gray-800 shadow-sm">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<div className="flex items-center">
						<a
							href="/"
							className="text-xl font-bold text-gray-900 dark:text-gray-100"
						>
							ARTICLEPLAY
						</a>
					</div>

					<div className="relative">
						<button
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
									<p className="text-xs text-gray-500 dark:text-gray-400 truncate">
										{user.email}
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
				</div>
			</div>
		</header>
	);
}
