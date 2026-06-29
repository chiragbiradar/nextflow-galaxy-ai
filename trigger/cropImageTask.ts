import { task } from "@trigger.dev/sdk";
import sharp from "sharp";

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

    const img = sharp(imgBuffer);
    const { width, height } = await img.metadata();
    if (!width || !height) throw new Error("Could not read image dimensions");

    const left = Math.round(width * x / 100);
    const top = Math.round(height * y / 100);
    const cropW = Math.round(width * w / 100);
    const cropH = Math.round(height * h / 100);

    const outBuf = await img.extract({ left, top, width: cropW, height: cropH }).jpeg().toBuffer();
    const outputUrl = `data:image/jpeg;base64,${outBuf.toString("base64")}`;

    return { outputUrl, durationMs: Date.now() - start };
  },
});
