import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import r2 from "../../db/r2";

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export interface UploadResult {
  url: string;
  key: string;
}

export async function uploadToR2(
  file: File,
  folder: string = "avatars",
): Promise<UploadResult> {
  const fileExtension = file.name.split(".").pop();
  const fileName = `${folder}/${randomUUID()}.${fileExtension}`;

  const buffer = await file.arrayBuffer();

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: new Uint8Array(buffer),
    ContentType: file.type,
  });

  await r2.send(command);

  const url = `${PUBLIC_URL}/${fileName}`;

  return {
    url,
    key: fileName,
  };
}
