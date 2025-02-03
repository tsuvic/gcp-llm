import { Storage } from "@google-cloud/storage";
import { logger } from "../utils/logger";

const storage = new Storage();
const bucketName = process.env.GCP_STORAGE_BUCKET;

export async function uploadToCloudStorage(
	content: string | Buffer,
	path: string,
	contentType: string,
) {
	if (!bucketName) {
		throw new Error("GCP_STORAGE_BUCKET is not set");
	}

	const bucket = storage.bucket(bucketName);
	const file = bucket.file(path);

	try {
		await file.save(content, {
			contentType,
			metadata: {
				cacheControl: "public, max-age=31536000",
			},
		});

		const gcsPath = `gs://${bucketName}/${path}`;

		return gcsPath;
	} catch (error) {
		logger.error({
			message: "File upload failed",
			path: `gs://${bucketName}/${path}`,
			contentType,
			error: error instanceof Error ? error.message : "Unknown error",
		});

		throw error;
	}
}

export async function uploadText(
	content: string,
	contentId: string,
	userId: string,
) {
	const path = `text/${userId}/${contentId}.json`;
	return uploadToCloudStorage(content, path, "application/json");
}

export async function uploadAudio(
	content: Buffer,
	contentId: string,
	index: number,
	userId: string,
) {
	const path = `audio/${userId}/${contentId}-${index}.mp3`;
	return uploadToCloudStorage(content, path, "audio/mp3");
}
