import {
	type ActionFunction,
	type LoaderFunction,
	redirect,
} from "@remix-run/node";
import { authenticator } from "../services/auth.server";

export const action: ActionFunction = ({ request }) => {
	return authenticator.authenticate("google", request);
};

export const loader: LoaderFunction = async () => {
	return redirect("/");
};
