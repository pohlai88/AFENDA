import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export type FileMetadata = {
  key: string;
  size?: number;
  contentType?: string;
  url?: string;
  createdAt?: string;
};

export type PutOptions = {
  contentType?: string;
  acl?: string;
  metadata?: Record<string, unknown>;
};

export type SignedUrlOptions = {
  method?: "GET" | "PUT";
  expiresSeconds?: number;
};

export type ListOptions = {
  limit?: number;
  cursor?: string;
};

export type ListResult = {
  items: FileMetadata[];
  nextCursor?: string;
};

export interface FileStore {
  put(key: string, data: Buffer | Readable, opts?: PutOptions): Promise<FileMetadata>;
  get(key: string): Promise<Readable | null>;
  getBuffer(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  signedUrl?(key: string, opts?: SignedUrlOptions): Promise<string>;
  list?(prefix?: string, opts?: ListOptions): Promise<ListResult>;
}

export class StorageError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code = "STORAGE_ERROR", details?: unknown) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.details = details;
  }
}

function normalizeKey(key: string): string {
  if (!key || key.trim().length === 0) {
    throw new StorageError("key is required", "INVALID_KEY");
  }
  return key.replace(/^\/+/, "");
}

function ensurePositiveLimit(limit: number | undefined, fallback: number): number {
  if (limit === undefined) return fallback;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new StorageError("limit must be an integer > 0", "INVALID_LIMIT");
  }
  return limit;
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable({ read() {} });
  stream.push(buffer);
  stream.push(null);
  return stream;
}

export class InMemoryFileStore implements FileStore {
  private readonly map = new Map<string, { buffer: Buffer; meta: FileMetadata }>();

  async put(key: string, data: Buffer | Readable, opts?: PutOptions): Promise<FileMetadata> {
    const safeKey = normalizeKey(key);
    const buffer = Buffer.isBuffer(data) ? data : await streamToBuffer(data);
    const meta: FileMetadata = {
      key: safeKey,
      size: buffer.length,
      contentType: opts?.contentType,
      createdAt: new Date().toISOString(),
    };
    this.map.set(safeKey, { buffer, meta });
    return meta;
  }

  async get(key: string): Promise<Readable | null> {
    const safeKey = normalizeKey(key);
    const found = this.map.get(safeKey);
    if (!found) return null;
    return bufferToStream(found.buffer);
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    const safeKey = normalizeKey(key);
    return this.map.get(safeKey)?.buffer ?? null;
  }

  async delete(key: string): Promise<void> {
    const safeKey = normalizeKey(key);
    this.map.delete(safeKey);
  }

  async exists(key: string): Promise<boolean> {
    const safeKey = normalizeKey(key);
    return this.map.has(safeKey);
  }

  async signedUrl(_key: string): Promise<string> {
    throw new StorageError("signedUrl not supported in InMemoryFileStore", "UNSUPPORTED");
  }

  async list(prefix = "", opts?: ListOptions): Promise<ListResult> {
    const safePrefix = prefix.replace(/^\/+/, "");
    const keys = [...this.map.keys()].filter((key) => key.startsWith(safePrefix)).sort();
    const start = opts?.cursor ? Math.max(0, keys.indexOf(opts.cursor) + 1) : 0;
    const limit = ensurePositiveLimit(opts?.limit, 100);
    const slice = keys.slice(start, start + limit);
    const items = slice.map((key) => this.map.get(key)?.meta).filter((x): x is FileMetadata => !!x);
    return {
      items,
      nextCursor: slice.length > 0 ? slice[slice.length - 1] : undefined,
    };
  }
}

export class LocalFsFileStore implements FileStore {
  constructor(private readonly baseDir: string) {}

  private resolveKey(key: string): string {
    const safeKey = normalizeKey(key);
    const normalized = path.normalize(safeKey).replace(/^([.][.]([/\\]|$))+/, "");
    return path.join(this.baseDir, normalized);
  }

  async put(key: string, data: Buffer | Readable, opts?: PutOptions): Promise<FileMetadata> {
    const safeKey = normalizeKey(key);
    const filePath = this.resolveKey(safeKey);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    if (Buffer.isBuffer(data)) {
      await fs.writeFile(filePath, data);
    } else {
      const write = createWriteStream(filePath);
      await pipeline(data, write);
    }

    const stat = await fs.stat(filePath);
    return {
      key: safeKey,
      size: stat.size,
      contentType: opts?.contentType,
      createdAt: stat.mtime.toISOString(),
    };
  }

  async get(key: string): Promise<Readable | null> {
    const safeKey = normalizeKey(key);
    const filePath = this.resolveKey(safeKey);
    try {
      await fs.access(filePath);
      return createReadStream(filePath);
    } catch {
      return null;
    }
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    const safeKey = normalizeKey(key);
    const filePath = this.resolveKey(safeKey);
    try {
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const safeKey = normalizeKey(key);
    const filePath = this.resolveKey(safeKey);
    try {
      await fs.unlink(filePath);
    } catch {
      // idempotent delete
    }
  }

  async exists(key: string): Promise<boolean> {
    const safeKey = normalizeKey(key);
    const filePath = this.resolveKey(safeKey);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async signedUrl(_key: string): Promise<string> {
    throw new StorageError("signedUrl not supported for LocalFsFileStore", "UNSUPPORTED");
  }

  async list(prefix = "", opts?: ListOptions): Promise<ListResult> {
    const rootPath = this.resolveKey(prefix);
    const allItems: FileMetadata[] = [];

    const walk = async (dirPath: string): Promise<void> => {
      let entries: string[];
      try {
        entries = await fs.readdir(dirPath);
      } catch {
        return;
      }

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        const stat = await fs.stat(entryPath);
        if (stat.isDirectory()) {
          await walk(entryPath);
          continue;
        }
        allItems.push({
          key: path.relative(this.baseDir, entryPath).replace(/\\/g, "/"),
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
        });
      }
    };

    await walk(rootPath);
    allItems.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

    const start = opts?.cursor
      ? Math.max(0, allItems.findIndex((item) => item.key === opts.cursor) + 1)
      : 0;
    const limit = ensurePositiveLimit(opts?.limit, 100);
    const items = allItems.slice(start, start + limit);

    return {
      items,
      nextCursor: items.length > 0 ? items[items.length - 1]?.key : undefined,
    };
  }
}

export type S3PutObjectRequest = {
  Bucket: string;
  Key: string;
  Body: Buffer | Readable;
  ContentType?: string;
  Metadata?: Record<string, string>;
  ACL?: string;
};

export type S3GetObjectRequest = {
  Bucket: string;
  Key: string;
};

export type S3DeleteObjectRequest = {
  Bucket: string;
  Key: string;
};

export type S3HeadObjectRequest = {
  Bucket: string;
  Key: string;
};

export type S3ListObjectsRequest = {
  Bucket: string;
  Prefix?: string;
  ContinuationToken?: string;
  MaxKeys?: number;
};

export type S3ListItem = {
  Key?: string;
  Size?: number;
  LastModified?: Date;
};

export type S3ClientLike = {
  putObject: (request: S3PutObjectRequest) => Promise<unknown>;
  getObject: (
    request: S3GetObjectRequest,
  ) => Promise<{ Body?: Buffer | Readable | string | Uint8Array | null }>;
  deleteObject: (request: S3DeleteObjectRequest) => Promise<unknown>;
  headObject: (request: S3HeadObjectRequest) => Promise<unknown>;
  listObjectsV2: (
    request: S3ListObjectsRequest,
  ) => Promise<{ Contents?: S3ListItem[]; NextContinuationToken?: string }>;
  getSignedUrl?: (
    operation: "getObject" | "putObject",
    request: { Bucket: string; Key: string; Expires: number },
  ) => string;
};

function metadataToStringMap(
  metadata: Record<string, unknown> | undefined,
): Record<string, string> | undefined {
  if (!metadata) return undefined;
  const entries = Object.entries(metadata).map(([key, value]) => [key, String(value)]);
  return Object.fromEntries(entries);
}

function bodyToBuffer(body: Buffer | Readable | string | Uint8Array): Promise<Buffer> | Buffer {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Readable) return streamToBuffer(body);
  if (typeof body === "string") return Buffer.from(body);
  return Buffer.from(body);
}

export class S3FileStore implements FileStore {
  private readonly client: S3ClientLike;
  private readonly bucket: string;

  constructor(opts: { client: S3ClientLike; bucket: string }) {
    this.client = opts.client;
    this.bucket = opts.bucket;
  }

  async put(key: string, data: Buffer | Readable, opts?: PutOptions): Promise<FileMetadata> {
    const safeKey = normalizeKey(key);
    await this.client.putObject({
      Bucket: this.bucket,
      Key: safeKey,
      Body: data,
      ContentType: opts?.contentType,
      Metadata: metadataToStringMap(opts?.metadata),
      ACL: opts?.acl,
    });

    const url = this.client.getSignedUrl?.("getObject", {
      Bucket: this.bucket,
      Key: safeKey,
      Expires: 60,
    });

    return {
      key: safeKey,
      contentType: opts?.contentType,
      url,
      createdAt: new Date().toISOString(),
    };
  }

  async get(key: string): Promise<Readable | null> {
    const safeKey = normalizeKey(key);
    try {
      const result = await this.client.getObject({ Bucket: this.bucket, Key: safeKey });
      if (!result.Body) return null;
      const body = await bodyToBuffer(result.Body);
      return bufferToStream(body);
    } catch {
      return null;
    }
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    const safeKey = normalizeKey(key);
    try {
      const result = await this.client.getObject({ Bucket: this.bucket, Key: safeKey });
      if (!result.Body) return null;
      return await bodyToBuffer(result.Body);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const safeKey = normalizeKey(key);
    await this.client.deleteObject({ Bucket: this.bucket, Key: safeKey });
  }

  async exists(key: string): Promise<boolean> {
    const safeKey = normalizeKey(key);
    try {
      await this.client.headObject({ Bucket: this.bucket, Key: safeKey });
      return true;
    } catch {
      return false;
    }
  }

  async signedUrl(key: string, opts?: SignedUrlOptions): Promise<string> {
    if (!this.client.getSignedUrl) {
      throw new StorageError("S3 client does not support signed URLs", "UNSUPPORTED");
    }

    const safeKey = normalizeKey(key);
    const operation = (opts?.method ?? "GET") === "GET" ? "getObject" : "putObject";
    const expires = opts?.expiresSeconds ?? 60;
    return this.client.getSignedUrl(operation, {
      Bucket: this.bucket,
      Key: safeKey,
      Expires: expires,
    });
  }

  async list(prefix = "", opts?: ListOptions): Promise<ListResult> {
    const limit = ensurePositiveLimit(opts?.limit, 100);
    const result = await this.client.listObjectsV2({
      Bucket: this.bucket,
      Prefix: prefix,
      ContinuationToken: opts?.cursor,
      MaxKeys: limit,
    });

    const items = (result.Contents ?? []).map((item) => ({
      key: item.Key ?? "",
      size: item.Size,
      createdAt: item.LastModified?.toISOString(),
    }));

    return {
      items,
      nextCursor: result.NextContinuationToken,
    };
  }
}

export const StorageAdapters = {
  InMemoryFileStore,
  LocalFsFileStore,
  S3FileStore,
  StorageError,
};

export default StorageAdapters;
