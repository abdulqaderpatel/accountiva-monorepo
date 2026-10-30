import { readdirSync } from "node:fs";
import { extname } from "node:path";
import { describe, expect, it } from "vitest";

const FUNCTIONS_DIRECTORY = new URL("./functions/", import.meta.url);
const FUNCTION_SOURCE_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]);

describe("Netlify functions layout", () => {
  it("contains only deployable function names", () => {
    const invalidFunctionSources = readdirSync(FUNCTIONS_DIRECTORY, {
      withFileTypes: true,
    })
      .filter(
        (entry) =>
          entry.isFile() && FUNCTION_SOURCE_EXTENSIONS.has(extname(entry.name)),
      )
      .map((entry) => entry.name)
      .filter((fileName) => {
        const functionName = fileName.slice(0, -extname(fileName).length);
        return !/^[A-Za-z0-9_-]+$/.test(functionName);
      });

    expect(invalidFunctionSources).toEqual([]);
  });
});
