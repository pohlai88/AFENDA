import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "meta/index": "src/meta/index.ts",
    "field-kit/index": "src/field-kit/index.ts",
    "generated/index": "src/generated/index.ts",
  },
  format: "esm",
  target: "es2022",
  outDir: "dist",
  clean: true,
  dts: true,
  splitting: true,
  jsx: "automatic",
  external: ["react", "react-dom"],
  banner: {
    js: '"use client";',
  },
});
