import { json } from "@remix-run/node";

//https://www.pwabuilder.com/reportcard?site=https://gcp-llm-732240525648.asia-northeast1.run.app/
//https://docs.pwabuilder.com/#/builder/android
export const loader = () => {
	return json(
		[
			{
				relation: ["delegate_permission/common.handle_all_urls"],
				target: {
					namespace: "android_app",
					package_name: "app.run.asia_northeast1.gcp_llm_732240525648.twa",
					sha256_cert_fingerprints: [
						"8C:D6:55:83:75:AC:1D:BF:70:E4:42:07:26:B8:DF:7F:10:AA:E9:94:9C:C9:40:73:B5:74:00:60:D4:C2:3D:36",
					],
				},
			},
		],
		{
			headers: {
				"Content-Type": "application/json",
			},
		},
	);
};
