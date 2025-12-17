import { Pinecone } from "@pinecone-database/pinecone";
import { convertToAscii } from "./utils";
import { getEmbeddings } from "./embeddings";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export async function getMatchesFromEmbeddings(
  embeddings: number[],
  fileKey: string
) {
  try {
    const index = pinecone.index("chatpdf");

    const namespace = index.namespace(convertToAscii(fileKey));

    const queryResult = await namespace.query({
      vector: embeddings,
      topK: 5,
      includeMetadata: true,
    });

    return queryResult.matches ?? [];
  } catch (error) {
    console.error("❌ Error querying Pinecone:", error);
    throw error;
  }
}

export async function getContext(query: string, fileKey: string) {
  const queryEmbeddings = await getEmbeddings(query);
  const matches = await getMatchesFromEmbeddings(queryEmbeddings, fileKey);

  const qualifyingDocs = matches.filter(
    (match) => typeof match.score === "number" && match.score > 0.7
  );

  const docs = qualifyingDocs.map(
    (match) => (match.metadata as { text?: string })?.text ?? ""
  );

  return docs.join("\n").slice(0, 3000);
}
