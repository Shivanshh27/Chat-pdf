import { Pinecone, type PineconeRecord } from "@pinecone-database/pinecone";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { downloadFromS3 } from "./s3-server";

/* ---------------- Pinecone setup ---------------- */

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const index = pinecone.index(
  process.env.PINECONE_INDEX_NAME!,
  process.env.PINECONE_INDEX_HOST!
);

/* ---------------- Types ---------------- */

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

/* ---------------- Main function ---------------- */

export async function loadS3IntoPinecone(fileKey: string) {
  // 1. Download PDF
  const filePath = await downloadFromS3(fileKey);
  if (!filePath) {
    throw new Error("Could not download file from S3");
  }

  // 2. Load PDF
  const loader = new PDFLoader(filePath);
  const pages = (await loader.load()) as PDFPage[];

  // 3. Prepare + split
  const preparedDocs = (await Promise.all(pages.map(prepareDocument))).flat();

  // 4. Embeddings
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small", // 1536 dims
  });

  const vectors: PineconeRecord[] = await Promise.all(
    preparedDocs.map(async (doc, i) => ({
      id: `${fileKey}-${i}`,
      values: await embeddings.embedQuery(doc.pageContent),
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
        source: fileKey,
      },
    }))
  );

  // 5. Upsert
  const namespace = index.namespace(fileKey.replace(/[^a-zA-Z0-9]/g, ""));

  await namespace.upsert(vectors);

  return { chunks: vectors.length };
}

/* ---------------- Helpers ---------------- */

export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;

  pageContent = pageContent.replace(/\n+/g, " ").trim();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  return splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
}
