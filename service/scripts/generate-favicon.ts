import { promises as fs } from "node:fs";
import sharp from "sharp";

const sizes = [16, 32, 48, 64, 128];

async function generateFavicon() {
	const svgContent = await fs.readFile("./favicon.svg", "utf-8");

	// 各サイズのPNGを生成
	const pngBuffers = await Promise.all(
		sizes.map((size) =>
			sharp(Buffer.from(svgContent)).resize(size, size).png().toBuffer(),
		),
	);

	// ICOファイルのヘッダー
	const header = Buffer.alloc(6);
	header.writeUInt16LE(0, 0); // Reserved
	header.writeUInt16LE(1, 2); // ICO type
	header.writeUInt16LE(sizes.length, 4); // Number of images

	// 各画像のディレクトリエントリを作成
	const entries = sizes.map((size, i) => {
		const entry = Buffer.alloc(16);
		entry.writeUInt8(size, 0); // Width
		entry.writeUInt8(size, 1); // Height
		entry.writeUInt8(0, 2); // Color palette
		entry.writeUInt8(0, 3); // Reserved
		entry.writeUInt16LE(1, 4); // Color planes
		entry.writeUInt16LE(32, 6); // Bits per pixel
		entry.writeUInt32LE(pngBuffers[i].length, 8); // Image size
		entry.writeUInt32LE(
			header.length +
				sizes.length * 16 +
				pngBuffers.slice(0, i).reduce((acc, buf) => acc + buf.length, 0),
			12,
		); // Image offset
		return entry;
	});

	// すべてのバッファを結合
	const icoBuffer = Buffer.concat([header, ...entries, ...pngBuffers]);

	// ファイルに保存
	await fs.writeFile("public/favicon.ico", icoBuffer);
}

generateFavicon().catch(console.error);
