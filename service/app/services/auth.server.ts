import { Authenticator } from "remix-auth";
import { type GoogleProfile, GoogleStrategy } from "remix-auth-google";
import { ulid } from "ulid";
import { createAccount } from "../function/firebase";
import { sessionStorage } from "./session.server";

// 管理するユーザー情報の型定義
export type User = {
	id: string; // Google sub
	email: string;
	name: string;
	avatarUrl: string;
	tenantId: string; // ULID for Firestore
};
export type Session = Omit<User, "id" | "email">; // subとemailはセッションに保存しない

// Authenticatorの作成
export const authenticator = new Authenticator<Session>(sessionStorage);

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
		// ユーザー情報登録
		const user: User = {
			id: profile.id,
			email: profile.emails[0].value,
			name: profile.displayName,
			avatarUrl: profile.photos?.[0]?.value || "",
			tenantId: ulid(), // 新規ユーザーの場合はULIDを生成
		};
		await createAccount(user);
		return {
			tenantId: user.tenantId,
			name: user.name,
			avatarUrl: user.avatarUrl,
		}; // セッションに保存するユーザーIDを返す
	},
);

authenticator.use(googleStrategy);
