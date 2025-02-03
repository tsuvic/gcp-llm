import { Link } from "@remix-run/react";

export function Header() {
	return (
		<header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm">
			<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex flex-col py-3">
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
				</div>
			</div>
		</header>
	);
}
