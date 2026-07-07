import { task } from "@trigger.dev/sdk";
import Transloadit from "transloadit";

export interface CropImageTaskPayload {
  imageUrl: string;
  x: number; // 0–100 %
  y: number;
  w: number;
  h: number;
}

export const cropImageTask = task({
  id: "crop-image",
  run: async (payload: CropImageTaskPayload) => {
    const start = Date.now();
    const { imageUrl, x, y, w, h } = payload;

    let imgBuffer: Buffer;
    if (imageUrl.startsWith("data:")) {
      const comma = imageUrl.indexOf(",");
      imgBuffer = Buffer.from(imageUrl.slice(comma + 1), "base64");
    } else {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`);
      imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    }

    const transloadit = new Transloadit({
      authKey: process.env.TRANSLOADIT_AUTH_KEY!,
      authSecret: process.env.TRANSLOADIT_AUTH_SECRET!,
    });

    const x1 = x / 100;
    const y1 = y / 100;
    const x2 = Math.min((x + w) / 100, 1);
    const y2 = Math.min((y + h) / 100, 1);

    const assembly = await transloadit.createAssembly({
      params: {
        steps: {
          crop: {
            robot: "/image/resize",
            use: ":original",
            crop: { x1, y1, x2, y2 },
            imagemagick_stack: "v3.0.0",
          },
        },
      },
      uploads: { file: imgBuffer },
      waitForCompletion: true,
    });

    const results = assembly.results as Record<string, { ssl_url: string }[]>;
    const result = results?.crop?.[0];
    if (!result?.ssl_url) throw new Error("Transloadit crop returned no output");

    return { outputUrl: result.ssl_url, durationMs: Date.now() - start };
  },
});
