import { createCookieSessionStorage } from "@remix-run/node";

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
