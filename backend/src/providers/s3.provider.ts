// src/modules/file/providers/s3.provider.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { FileStorageProvider } from "./storage.provider";
import crypto from "crypto";

export class S3StorageProvider implements FileStorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.bucket = process.env.AWS_S3_BUCKET!;
    this.publicBaseUrl =
      process.env.AWS_PUBLIC_URL ||
      `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com`;
  }

  async upload(params: {
    buffer: Buffer;
    mimeType: string;
    filename: string;
    folder: string;
  }): Promise<{ url: string; storageKey: string }> {
    const extension = params.filename.split(".").pop();
    const key = `${params.folder}/${crypto.randomUUID()}.${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.mimeType,
        ACL: "public-read", // optional (can be private + signed URLs)
      })
    );

    return {
      storageKey: key,
      url: `${this.publicBaseUrl}/${key}`,
    };
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      })
    );
  }
}
