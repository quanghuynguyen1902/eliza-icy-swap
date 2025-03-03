import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    external: [
        "dotenv",
        "fs",
        "zod",
        "path",
        "events", // Mark events as external to prevent bundling
        "node-cache" // Optional: Ensure this isn't being bundled improperly
    ],
});
