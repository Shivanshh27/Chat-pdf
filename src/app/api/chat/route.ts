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

    // 2️⃣ Save user message
    await db.insert(_messages).values({
      chatId,
      role: "user",
      content: lastMessage.content,
    });

    // 3️⃣ Get context
    const context = await getContext(lastMessage.content, fileKey);

    // 4️⃣ System prompt
    const systemPrompt = `
You are a helpful AI assistant.
Answer ONLY using the provided context.

START CONTEXT
${context}
END CONTEXT

If the answer is not in the context, say:
"I'm sorry, but I don't know the answer to that question."
`;

    // 5️⃣ Stream AI response
    const result = await streamText({
      model: openai.chat("gpt-4o-mini"),
      system: systemPrompt,
      messages: messages.filter((m: any) => m.role === "user"),

      onFinish: async ({ text }: { text: string }) => {
        await db.insert(_messages).values({
          chatId,
          role: "system",
          content: text,
        });
      },
    });

    // 7️⃣ Return stream
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("❌ /api/chat error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
