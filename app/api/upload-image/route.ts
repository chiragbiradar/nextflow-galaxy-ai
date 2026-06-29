import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Transloadit } from "transloadit";

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Accepted: jpg, jpeg, png, webp, gif" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const client = new Transloadit({
    authKey: process.env.TRANSLOADIT_AUTH_KEY!,
    authSecret: process.env.TRANSLOADIT_AUTH_SECRET!,
  });

  const assembly = await client.createAssembly({
    uploads: { file: buffer },
    params: {
      steps: { ":original": { robot: "/upload/handle" } },
    },
    waitForCompletion: true,
  });

  // Transloadit returns uploaded originals in assembly.uploads
  type FileResult = { ssl_url?: string | null };
  const uploads = assembly.uploads as FileResult[] | undefined;
  const results = assembly.results as Record<string, FileResult[]> | undefined;
  const url =
    uploads?.[0]?.ssl_url ??
    results?.[":original"]?.[0]?.ssl_url;

  if (!url) {
    return NextResponse.json({ error: "Upload failed — no URL returned" }, { status: 500 });
  }

  return NextResponse.json({ url });
}
