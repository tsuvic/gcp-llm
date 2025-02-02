import { Link } from "@remix-run/react";

export function Header() {
	return (
		<header className="bg-white dark:bg-gray-800 shadow-sm">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16 items-center">
					<Link
						to="/"
						className="text-2xl font-bold text-blue-600 dark:text-blue-400"
					>
						ARTICLEPLAY
					</Link>
					<nav className="flex space-x-4">
						{/* 必要に応じてナビゲーションリンクを追加 */}
					</nav>
				</div>
			</div>
		</header>
	);
}
