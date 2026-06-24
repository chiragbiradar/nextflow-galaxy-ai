import { task, wait } from "@trigger.dev/sdk";

export interface CropImageTaskPayload {
  imageUrl: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const cropImageTask = task({
  id: "crop-image",
  run: async (payload: CropImageTaskPayload) => {
    const start = Date.now();

    const authKey = process.env.TRANSLOADIT_AUTH_KEY!;
    const authSecret = process.env.TRANSLOADIT_AUTH_SECRET!;

    // Build Transloadit assembly
    const params = {
      auth: { key: authKey },
      steps: {
        ":original": { robot: "/upload/handle" },
        cropped: {
          use: ":original",
          robot: "/image/resize",
          crop: true,
          crop_x1: payload.x,
          crop_y1: payload.y,
          crop_x2: payload.x + payload.w,
          crop_y2: payload.y + payload.h,
          result: true,
        },
      },
    };

    // Create assembly
    const formData = new FormData();
    formData.append("params", JSON.stringify(params));

    // Sign the request
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(authSecret),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(JSON.stringify(params)));
    const sigHex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    formData.append("signature", `sha1:${sigHex}`);

    // Fetch image and attach
    const imgRes = await fetch(payload.imageUrl);
    const imgBlob = await imgRes.blob();
    formData.append("file", imgBlob, "image.jpg");

    const assemblyRes = await fetch("https://api2.transloadit.com/assemblies", {
      method: "POST",
      body: formData,
    });
    const assembly = await assemblyRes.json();

    // Poll assembly until complete (mandatory 30s+ wait)
    await wait.for({ seconds: 35 });

    let result = assembly;
    for (let i = 0; i < 20; i++) {
      const pollRes = await fetch(assembly.assembly_ssl_url);
      result = await pollRes.json();
      if (result.ok === "ASSEMBLY_COMPLETED" || result.error) break;
      await wait.for({ seconds: 5 });
    }

    if (result.error) throw new Error(result.error);

    const outputUrl = result.results?.cropped?.[0]?.ssl_url ?? null;
    const durationMs = Date.now() - start;

    return { outputUrl, durationMs };
  },
});
