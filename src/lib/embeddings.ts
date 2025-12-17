import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

export async function getEmbeddings(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),

      value: text.replace(/\n/g, " "),
    });

    return embedding;
  } catch (error) {
    console.error("❌ Error generating embeddings:", error);
    throw error;
  }
}
