import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getContext } from "@/lib/context";
import { db } from "@/lib/db";
import { chats, messages as _messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { messages, chatId } = await req.json();

    // 1️⃣ Validate chat
    const chat = await db.select().from(chats).where(eq(chats.id, chatId));
    if (chat.length !== 1) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const fileKey = chat[0].fileKey;
    const lastMessage = messages[messages.length - 1];

    // 2️⃣ Save user message FIRST (no onStart in v5)
    await db.insert(_messages).values({
      chatId,
      role: "user",
      content: lastMessage.content,
    });

    // 3️⃣ Build context
    const context = await getContext(lastMessage.content, fileKey);

    const systemPrompt = `
You are a helpful AI assistant.
Answer ONLY using the provided context.

START CONTEXT
${context}
END CONTEXT

If the answer is not in the context, say:
"I'm sorry, but I don't know the answer to that question."
`;

    // 4️⃣ Stream response
    const result = await streamText({
      model: openai("gpt-3.5-turbo"),
      system: systemPrompt,
      messages: messages.filter((m: any) => m.role === "user"),
      onFinish: async ({ text }) => {
        // Save assistant reply (mapped to "system")
        await db.insert(_messages).values({
          chatId,
          role: "system",
          content: text,
        });
      },
    });

    // ✅ v5 response
    return new Response(result.textStream);
  } catch (error) {
    console.error("❌ /api/chat error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
