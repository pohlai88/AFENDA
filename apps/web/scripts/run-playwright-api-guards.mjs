import { spawnSync } from "node:child_process";

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "playwright",
    "test",
    "e2e/admin-api-guards.spec.ts",
    "--project=chromium",
    "--workers=1",
  ],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      PLAYWRIGHT_REQUIRE_API: "1",
    },
  },
);

process.exit(result.status ?? 1);
