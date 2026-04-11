import { NextResponse } from "next/server";

import { testOneApiConnectivity } from "@/lib/llm-features";

function maskKey(value: string | undefined) {
  if (!value) return "";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export async function GET() {
  const result = await testOneApiConnectivity();
  return NextResponse.json({
    ...result,
    apiKeyPreview: maskKey(process.env.ONE_API_KEY),
    visionModel: process.env.ONE_API_GEMINI_VISION_MODEL || "",
  });
}

export async function POST() {
  const result = await testOneApiConnectivity();
  return NextResponse.json({
    ...result,
    apiKeyPreview: maskKey(process.env.ONE_API_KEY),
    visionModel: process.env.ONE_API_GEMINI_VISION_MODEL || "",
  });
}
