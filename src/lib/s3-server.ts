import AWS from "aws-sdk";
import fs from "fs";
import path from "path";

export async function downloadFromS3(file_key: string) {
  try {
    AWS.config.update({
      accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
      region: "eu-north-1",
    });

    const s3 = new AWS.S3();

    const params = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: decodeURIComponent(file_key), // IMPORTANT
    };

    const obj = await s3.getObject(params).promise();

    if (!obj.Body) {
      throw new Error("Empty S3 object body");
    }

    // Ensure tmp directory exists
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const file_name = path.join(tmpDir, `pdf-${Date.now()}.pdf`);

    // WRITE TO LOCAL FILE (THIS FIXES ENOENT)
    fs.writeFileSync(file_name, obj.Body as Buffer);

    return file_name;
  } catch (error) {
    console.error("downloadFromS3 error:", error);
    return null;
  }
}
