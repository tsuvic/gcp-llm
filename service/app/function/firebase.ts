import { Firestore, Timestamp } from "@google-cloud/firestore";
import type { ContentGetCollection, ContentSetCollection } from "../types";
import { logger } from "../utils/logger";

const db = new Firestore({
	projectId: process.env.GCP_PROJECT_ID,
	databaseId: "gcp-llm",
});

export const saveContent = async (
	data: ContentSetCollection,
	userId: string,
	contentId: string,
) => {
	try {
		const userDocRef = db.collection("users").doc(userId);
		const contentDocRef = userDocRef.collection("contents").doc(contentId);

		const contentData: ContentSetCollection = {
			url: data.url,
			audioCount: data.audioCount,
			title: data.title,
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now(),
			status: "completed",
		};

		await contentDocRef.set(contentData);
	} catch (error) {
		logger.error({
			message: "Failed to save content to Firestore",
			userId,
			contentId,
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

		logger.info({
			message: "Content retrieved from Firestore",
			userId,
			contentId,
		});

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
