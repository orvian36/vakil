import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, BUCKET, ENDPOINT } from "./client";

export async function uploadFile(fileBuffer: Buffer, key: string) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileBuffer,
      ACL: "public-read", // optional: makes it public
    })
  );
  console.log(`${ENDPOINT}/${key}`);
  return `${key}`;
}
