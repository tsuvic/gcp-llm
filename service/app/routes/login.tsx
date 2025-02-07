import type { LoaderFunction } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { authenticator } from "../services/auth.server";

export const loader: LoaderFunction = async ({ request }) => {
	// successRedirectオプションを使用
	return await authenticator.isAuthenticated(request, {
		successRedirect: "/",
	});
};

export default function Login() {
	return (
		<div className="px-4 py-12 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 max-w-md w-full">
				<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-8">
					Welcome to ArticlePlay
				</h1>
				<Form
					action="/auth/google"
					method="post"
					className="flex justify-center"
				>
					<button
						type="submit"
						className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
					>
						<svg className="w-7 h-7" viewBox="0 0 24 24">
							<title>Continue with Google</title>
							<path
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								fill="#4285F4"
							/>
							<path
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								fill="#34A853"
							/>
							<path
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								fill="#FBBC05"
							/>
							<path
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								fill="#EA4335"
							/>
						</svg>
						Continue with Google
					</button>
				</Form>
			</div>
		</div>
	);
}
