import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PermissionValues, PermissionMeta } from "../dist/shared/permissions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const rows = PermissionValues.map((permission) => {
    const meta = PermissionMeta[permission];
    return {
      key: permission,
      description: meta?.description ?? null,
      deprecated: Boolean(meta?.deprecated),
      replacedBy: meta?.replacedBy ?? null,
    };
  });

  const outDir = path.resolve(__dirname, "../../db/src/seeds");
  const outFile = path.join(outDir, "permissions.generated.json");

  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, `${JSON.stringify(rows, null, 2)}\n`, "utf8");

  console.log(`permission-seed: wrote ${rows.length} rows to ${outFile}`);
}

main().catch((error) => {
  console.error("permission-seed: failed", error);
  process.exitCode = 1;
});
