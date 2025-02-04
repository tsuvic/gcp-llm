import { Firestore, Timestamp } from "@google-cloud/firestore";
import type { User } from "../services/auth.server";
import type { ContentGetCollection, ContentSetCollection } from "../types";
import { toJSTDate } from "../utils/date";
import { logger } from "../utils/logger";

const db = new Firestore({
	projectId: process.env.GCP_PROJECT_ID,
	databaseId: "gcp-llm",
});

export const findOrCreateUser = async (user: User) => {
	const userRef = db.collection("users").doc(user.id);
	const userSnapshot = await userRef.get();
	if (userSnapshot.exists) {
		return userSnapshot.data() as User;
	}
	await userRef.set(user);
	return user;
};

export const saveContent = async (
	data: ContentSetCollection,
	userId: string,
	contentId: string,
) => {
	try {
		const userDocRef = db.collection("users").doc(userId);
		const contentDocRef = userDocRef.collection("contents").doc(contentId);

		const now = toJSTDate(new Date());
		const contentData: ContentSetCollection = {
			url: data.url,
			audioCount: data.audioCount,
			title: data.title,
			createdAt: Timestamp.fromDate(now),
			updatedAt: Timestamp.fromDate(now),
			status: "completed",
		};

		await contentDocRef.set(contentData);
		return contentId;
	} catch (error) {
		logger.error({
			message: "Failed to save content to Firestore",
			userId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		throw error;
	}
};

export const getContents = async (userId: string) => {
	try {
		const userDocRef = db.collection("users").doc(userId);
		const contentsSnapshot = await userDocRef.collection("contents").get();
		const contents: ContentGetCollection[] = contentsSnapshot.docs.map(
			(doc) =>
				({
					contentId: doc.id,
					...doc.data(),
				}) as ContentGetCollection,
		);

		return contents;
	} catch (error) {
		logger.error({
			message: "Failed to retrieve contents from Firestore",
			userId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		throw error;
	}
};

export const getContent = async (userId: string, contentId: string) => {
	try {
		const userDocRef = db.collection("users").doc(userId);
		const contentDocRef = userDocRef.collection("contents").doc(contentId);
		const contentSnapshot = await contentDocRef.get();

		if (!contentSnapshot.exists) {
			logger.warn({
				message: "Content not found in Firestore",
				userId,
				contentId,
			});
			return null;
		}

		return contentSnapshot.data() as ContentGetCollection;
	} catch (error) {
		logger.error({
			message: "Failed to retrieve content from Firestore",
			userId,
			contentId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		throw error;
	}
};
