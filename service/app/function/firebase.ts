import { Firestore, Timestamp } from "@google-cloud/firestore";
import type { ContentGetCollection, ContentSetCollection } from "../types";

const db = new Firestore({
	projectId: process.env.GCP_PROJECT_ID,
	databaseId: "gcp-llm",
});

export const saveContent = async (
	data: ContentSetCollection,
	userId: string,
	contentId: string,
) => {
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
};

export const getContents = async (userId: string) => {
	const userDocRef = db.collection("users").doc(userId);
	const contentsSnapshot = await userDocRef.collection("contents").get();
	const contents: ContentGetCollection[] = contentsSnapshot.docs.map(
		(doc) => doc.data() as ContentGetCollection,
	);
	return contents;
};

export const getContent = async (userId: string, contentId: string) => {
	const userDocRef = db.collection("users").doc(userId);
	const contentDocRef = userDocRef.collection("contents").doc(contentId);
	const contentSnapshot = await contentDocRef.get();

	if (!contentSnapshot.exists) return null;

	return contentSnapshot.data() as ContentGetCollection;
};
