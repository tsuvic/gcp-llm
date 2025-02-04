import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { authenticator } from "../services/auth.server";

export const action: ActionFunction = async ({ request }) => {
	await authenticator.logout(request, { redirectTo: "/login" });
};

export const loader: LoaderFunction = async () => {
	return redirect("/");
};
