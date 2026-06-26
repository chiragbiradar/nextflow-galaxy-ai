import { task } from "@trigger.dev/sdk";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const exec = promisify(execFile);

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

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`);
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tmpIn = join(tmpdir(), `crop-in-${id}.jpg`);
    const tmpOut = join(tmpdir(), `crop-out-${id}.jpg`);

    try {
      await writeFile(tmpIn, imgBuffer);

      // FFmpeg percentage-based crop:
      // crop=iw*(w/100):ih*(h/100):iw*(x/100):ih*(y/100)
      const cropFilter = `crop=iw*${w}/100:ih*${h}/100:iw*${x}/100:ih*${y}/100`;
      const ffmpegBin = process.env.FFMPEG_PATH ?? "ffmpeg";
      await exec(ffmpegBin, ["-i", tmpIn, "-vf", cropFilter, "-y", tmpOut]);

      const outBuf = await readFile(tmpOut);
      const outputUrl = `data:image/jpeg;base64,${outBuf.toString("base64")}`;

      // Mandatory 30s minimum latency per spec
      const elapsed = Date.now() - start;
      if (elapsed < 30000) await new Promise((r) => setTimeout(r, 30000 - elapsed));

      return { outputUrl, durationMs: Date.now() - start };
    } finally {
      await unlink(tmpIn).catch(() => {});
      await unlink(tmpOut).catch(() => {});
    }
  },
});
