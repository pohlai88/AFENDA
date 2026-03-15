import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  InMemoryFileStore,
  LocalFsFileStore,
  S3FileStore,
  StorageError,
  type S3ClientLike,
} from "../storage";

describe("adapters/storage", () => {
  it("InMemoryFileStore put/get/list/delete", async () => {
    const store = new InMemoryFileStore();

    await store.put("docs/a.txt", Buffer.from("hello"), { contentType: "text/plain" });
    await store.put("docs/b.txt", Buffer.from("world"), { contentType: "text/plain" });

    const existsBefore = await store.exists("docs/a.txt");
    expect(existsBefore).toBe(true);

    const buf = await store.getBuffer("docs/a.txt");
    expect(buf?.toString("utf8")).toBe("hello");

    const listed = await store.list("docs", { limit: 10 });
    expect(listed.items).toHaveLength(2);
    expect(listed.items[0]?.key).toBe("docs/a.txt");

    await store.delete("docs/a.txt");
    const existsAfter = await store.exists("docs/a.txt");
    expect(existsAfter).toBe(false);
  });

  it("LocalFsFileStore persists files on disk", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "afenda-storage-"));
    const store = new LocalFsFileStore(tempDir);

    await store.put("attachments/x.bin", Buffer.from("abc"));
    const exists = await store.exists("attachments/x.bin");
    expect(exists).toBe(true);

    const buffer = await store.getBuffer("attachments/x.bin");
    expect(buffer?.toString("utf8")).toBe("abc");

    const listed = await store.list("attachments");
    expect(listed.items.map((item) => item.key)).toContain("attachments/x.bin");

    await store.delete("attachments/x.bin");
    const existsAfter = await store.exists("attachments/x.bin");
    expect(existsAfter).toBe(false);

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("S3FileStore uses client-like methods", async () => {
    const seen: Array<{ op: string; key?: string }> = [];

    const client: S3ClientLike = {
      async putObject(request) {
        seen.push({ op: "put", key: request.Key });
        return {};
      },
      async getObject(request) {
        seen.push({ op: "get", key: request.Key });
        return { Body: Buffer.from("payload") };
      },
      async deleteObject(request) {
        seen.push({ op: "delete", key: request.Key });
        return {};
      },
      async headObject(request) {
        seen.push({ op: "head", key: request.Key });
        return {};
      },
      async listObjectsV2(request) {
        seen.push({ op: "list", key: request.Prefix });
        return {
          Contents: [
            { Key: "p/a.txt", Size: 7, LastModified: new Date("2026-01-01T00:00:00.000Z") },
          ],
          NextContinuationToken: "next-1",
        };
      },
      getSignedUrl(_op, request) {
        return `https://example.test/${request.Bucket}/${request.Key}`;
      },
    };

    const store = new S3FileStore({ client, bucket: "bucket-1" });

    await store.put("p/a.txt", Buffer.from("payload"), { contentType: "text/plain" });
    const url = await store.signedUrl("p/a.txt", { method: "GET", expiresSeconds: 120 });
    const exists = await store.exists("p/a.txt");
    const list = await store.list("p/");
    const data = await store.getBuffer("p/a.txt");
    await store.delete("p/a.txt");

    expect(url).toContain("bucket-1/p/a.txt");
    expect(exists).toBe(true);
    expect(list.items).toHaveLength(1);
    expect(data?.toString("utf8")).toBe("payload");
    expect(seen.map((x) => x.op)).toEqual(["put", "head", "list", "get", "delete"]);
  });

  it("throws StorageError when signedUrl unsupported", async () => {
    const store = new InMemoryFileStore();
    await expect(store.signedUrl("a.txt")).rejects.toBeInstanceOf(StorageError);
  });
});
