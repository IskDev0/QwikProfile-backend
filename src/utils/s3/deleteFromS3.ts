import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import r2 from "../../db/r2";

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export async function deleteFromR2(fileUrl: string): Promise<void> {
  if (!fileUrl || fileUrl === "") {
    return;
  }

  try {
    const key = fileUrl.replace(`${PUBLIC_URL}/`, "");

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2.send(command);
  } catch (error) {
    console.error("Error deleting file from R2:", error);
  }
}
