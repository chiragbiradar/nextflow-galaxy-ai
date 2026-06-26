import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const authKey = process.env.TRANSLOADIT_AUTH_KEY;
  const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;

  if (!authKey || !authSecret) {
    return NextResponse.json({ error: "Transloadit not configured" }, { status: 500 });
  }

  const params = {
    auth: { key: authKey },
    steps: { ":original": { robot: "/upload/handle" } },
  };

  // Sign params with HMAC-SHA1
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authSecret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(JSON.stringify(params)));
  const sigHex = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const tForm = new FormData();
  tForm.append("params", JSON.stringify(params));
  tForm.append("signature", `sha1:${sigHex}`);
  tForm.append("file", file);

  const assemblyRes = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: tForm,
  });
  const assembly = await assemblyRes.json() as {
    assembly_ssl_url: string;
    ok?: string;
    error?: string;
    results?: Record<string, { ssl_url: string }[]>;
  };

  // Poll until complete
  let result = assembly;
  for (let i = 0; i < 30; i++) {
    if (result.ok === "ASSEMBLY_COMPLETED" || result.error) break;
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(assembly.assembly_ssl_url);
    result = await pollRes.json() as typeof assembly;
  }

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const url = result.results?.[":original"]?.[0]?.ssl_url ?? null;
  return NextResponse.json({ url });
}
