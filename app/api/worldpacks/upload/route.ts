import { NextRequest, NextResponse } from "next/server";

import { uploadWorldPack } from "@/lib/app-service";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let title = "Untitled World";
    let text = "";
    let originalName: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      title = String(formData.get("title") || title);
      const file = formData.get("file");
      if (file instanceof File) {
        text = await file.text();
        originalName = file.name;
      } else {
        text = String(formData.get("text") || "");
      }
    } else {
      const body = await request.json();
      title = String(body.title || title);
      text = String(body.text || "");
      originalName = body.originalName;
    }

    const world = await uploadWorldPack({ title, text, originalName });
    return NextResponse.json({ world });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload world pack" },
      { status: 400 }
    );
  }
}
