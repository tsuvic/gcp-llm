import { Firestore, Timestamp } from "@google-cloud/firestore";
import type { User } from "../services/auth.server";
import type { ContentGetCollection, ContentSetCollection } from "../types";
import { logger } from "../utils/logger";

const db = new Firestore({
	projectId: process.env.GCP_PROJECT_ID,
	databaseId: "gcp-llm",
});

export const createAccount = async (user: User) => {
	const userRef = db.collection("users").doc(user.tenantId); //google sub idをテナントキーとしてドキュメントキーとして保存
	await userRef.set({
		// tenantIdはfirestoreのドキュメントキーとして保存するため、userオブジェクトから除外
		userId: user.userId,
		name: user.name,
		email: user.email,
		avatarUrl: user.avatarUrl,
		createdAt: Timestamp.fromDate(new Date()),
		updatedAt: Timestamp.fromDate(new Date()),
	});

	return user;
};

export const saveContent = async (
	data: ContentSetCollection,
	tenantId: string,
	contentId: string,
) => {
	try {
		const userDocRef = db.collection("users").doc(tenantId);
		const contentDocRef = userDocRef.collection("contents").doc(contentId);
		await contentDocRef.set(data);
		return contentId;
	} catch (error) {
		logger.error({
			message: "Failed to save content to Firestore",
			userId: tenantId,
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
					createdAt: doc.data().createdAt.toDate(),
					updatedAt: doc.data().updatedAt.toDate(),
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
