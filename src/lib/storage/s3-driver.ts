import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { StorageError, type StorageDriver, type StoredObject } from "./types";

export interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  /** Optional CDN or bucket URL for direct fetching. */
  publicUrlBase?: string;
}

/**
 * S3-compatible driver (Spec 12.5). Works with AWS S3, MinIO, Cloudflare R2,
 * Backblaze B2, Hetzner Object Storage and similar.
 */
export class S3StorageDriver implements StorageDriver {
  readonly name = "s3";
  private readonly client: S3Client;

  constructor(private readonly config: S3Config) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Belt and braces against a stored object ever being interpreted as
          // something executable by a browser (Spec 8.6).
          ContentDisposition: "inline",
        }),
      );
    } catch (error) {
      throw new StorageError(`Could not upload ${key}`, error);
    }
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
      if (!result.Body) return null;

      const bytes = await result.Body.transformToByteArray();
      return {
        body: Buffer.from(bytes),
        contentType: result.ContentType ?? "application/octet-stream",
      };
    } catch (error) {
      const name = (error as { name?: string })?.name;
      if (name === "NoSuchKey" || name === "NotFound") return null;
      throw new StorageError(`Could not read ${key}`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
    } catch (error) {
      throw new StorageError(`Could not delete ${key}`, error);
    }
  }

  publicUrl(key: string): string | null {
    if (!this.config.publicUrlBase) return null;
    return `${this.config.publicUrlBase.replace(/\/+$/, "")}/${key}`;
  }
}
