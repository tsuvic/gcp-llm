import { Authenticator } from "remix-auth";
import { type GoogleProfile, GoogleStrategy } from "remix-auth-google";
import { findOrCreateUser } from "../function/firebase";
import { sessionStorage } from "./session.server";

// セッションに保存するユーザー情報の型定義
export type User = {
	id: string;
	email: string;
	name: string;
	avatarUrl: string;
};

// Authenticatorの作成
export const authenticator = new Authenticator<User>(sessionStorage);

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
	throw new Error("Google OAuth credentials are not properly configured");
}

if (!process.env.GOOGLE_AUTH_CLIENT_URL) {
	throw new Error("GOOGLE_AUTH_CLIENT_URL is not properly configured");
}

const googleStrategy = new GoogleStrategy(
	{
		clientID: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		callbackURL: `${process.env.GOOGLE_AUTH_CLIENT_URL}/auth/google/callback`,
	},
	async ({ profile }: { profile: GoogleProfile }) => {
		const user: User = {
			id: profile.id,
			email: profile.emails[0].value,
			name: profile.displayName,
			avatarUrl: profile.photos?.[0]?.value || "",
		};
		return await findOrCreateUser(user);
	},
);

authenticator.use(googleStrategy);
