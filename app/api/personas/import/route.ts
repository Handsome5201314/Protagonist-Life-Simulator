import { NextRequest, NextResponse } from "next/server";

import { importPersona } from "@/lib/app-service";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let payload: unknown;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const name = form.get("name");
      const ageBand = form.get("ageBand");
      const relation = form.get("relation");

      if (!(file instanceof File)) {
        throw new Error("No upload file provided");
      }

      const rawText = await file.text();
      const trimmed = rawText.trim();

      try {
        payload = JSON.parse(trimmed);
      } catch {
        payload = {
          source: "upload",
          name: typeof name === "string" && name.trim() ? name.trim() : file.name.replace(/\.[^.]+$/, ""),
          rawText: trimmed,
          ageBand: typeof ageBand === "string" && ageBand ? ageBand : "adult",
          relation: typeof relation === "string" && relation ? relation : "SELF",
          interests: ["上传文件", "分身铸造", "数字基因"],
          fears: ["关键设定丢失"],
        };
      }
    } else {
      payload = await request.json();
    }

    const persona = await importPersona(payload);
    return NextResponse.json({ persona });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import persona" },
      { status: 400 }
    );
  }
}
