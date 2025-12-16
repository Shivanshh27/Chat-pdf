import { Pinecone } from "@pinecone-database/pinecone";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { downloadFromS3 } from "./s3-server";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const index = pinecone.index(
  process.env.PINECONE_INDEX_NAME!,
  process.env.PINECONE_INDEX_HOST!
);

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPinecone(fileKey: string) {
  // 1. Download PDF
  const filePath = await downloadFromS3(fileKey);
  if (!filePath) {
    throw new Error("Could not download file from S3");
  }

  // 2. Load PDF
  const loader = new PDFLoader(filePath);
  const docs = await loader.load(); // Document[]

  // 3. Split text
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const splitDocs = await splitter.splitDocuments(docs);

  // 4. Embed
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small", // 1536 dims ✔
  });

  const vectors = await Promise.all(
    splitDocs.map(async (doc, i) => {
      const embedding = await embeddings.embedQuery(doc.pageContent);

      return {
        id: `${fileKey}-${i}`,
        values: embedding,
        metadata: {
          text: doc.pageContent,
          source: fileKey,
          page: doc.metadata?.loc?.pageNumber ?? null,
        },
      };
    })
  );

  // 5. Upsert into Pinecone
  const namespace = index.namespace(fileKey.replace(/[^a-zA-Z0-9]/g, ""));

  await namespace.upsert(vectors);

  return {
    chunks: vectors.length,
  };
}

