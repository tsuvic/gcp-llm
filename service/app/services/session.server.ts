import { createCookieSessionStorage } from "@remix-run/node";
import { authenticator } from "./auth.server";

if (!process.env.SESSION_SECRET) {
	throw new Error("SESSION_SECRET must be set");
}

export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: "_session",
		sameSite: "lax",
		path: "/",
		httpOnly: true,
		secrets: [process.env.SESSION_SECRET],
		secure: process.env.NODE_ENV === "production",
		maxAge: 60 * 60 * 24 * 30, // 30 days
	},
});

export const { getSession, commitSession, destroySession } = sessionStorage;

export const getSessionUser = async (request: Request) => {
	const session = await getSession(request.headers.get("Cookie"));
	return session.get(authenticator.sessionKey);
};
