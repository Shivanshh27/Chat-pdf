import { loadS3IntoPinecone } from "@/lib/pinecone";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("RAW BODY:", body);

    const { file_key, file_name } = body ?? {};

    if (typeof file_key !== "string" || typeof file_name !== "string") {
      return NextResponse.json(
        { error: "file_key or file_name missing or invalid" },
        { status: 400 }
      );
    }

    console.log("create-chat start:", file_key, file_name);

    await loadS3IntoPinecone(file_key);

    console.log("create-chat done");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("create-chat error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
