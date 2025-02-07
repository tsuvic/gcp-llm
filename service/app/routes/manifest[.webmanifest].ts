import type { WebAppManifest } from "@remix-pwa/dev";
import { json } from "@remix-run/node";

// https://developer.mozilla.org/ja/docs/Web/Manifest
export const loader = () => {
	return json(
		{
			short_name: "ArticlePlay",
			name: "ArticlePlay",
			description: "ArticlePlay",
			display: "standalone",
			scope: "/",
			start_url: "/",
			icons: [
				{
					src: "icon-48x48.png",
					sizes: "48x48",
					type: "image/png",
				},
				{
					src: "icon-72x72.png",
					sizes: "72x72",
					type: "image/png",
				},
				{
					src: "icon-96x96.png",
					sizes: "96x96",
					type: "image/png",
				},
				{
					src: "icon-128x128.png",
					sizes: "128x128",
					type: "image/png",
				},
				{
					src: "icon-144x144.png",
					sizes: "144x144",
					type: "image/png",
				},
				{
					src: "icon-150x150.png",
					sizes: "150x150",
					type: "image/png",
				},
				{
					src: "icon-192x192.png",
					sizes: "192x192",
					type: "image/png",
				},
				{
					src: "icon-512x512.png",
					sizes: "512x512",
					type: "image/png",
				},
			],
			background_color: "#000000",
			theme_color: "#696969",
			share_target: {
				action: "/share",
				method: "POST",
				params: {
					title: "title",
					text: "text",
					url: "url",
				},
			},
		} as WebAppManifest,
		{
			headers: {
				"Cache-Control": "public, max-age=60",
				"Content-Type": "application/manifest+json",
			},
		},
	);
};
