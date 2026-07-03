import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = process.cwd();

function withExtension(filePath) {
  if (path.extname(filePath)) return filePath;
  return `${filePath}.ts`;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("file:")) {
    return { url: specifier, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    const target = withExtension(path.join(root, specifier.slice(2)));
    return { url: pathToFileURL(target).href, shortCircuit: true };
  }
  if (specifier.endsWith(".ts") || specifier.endsWith(".tsx")) {
    const parent = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : root;
    return { url: pathToFileURL(path.resolve(parent, specifier)).href, shortCircuit: true };
  }
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    const parent = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : root;
    const base = specifier.startsWith("/") ? specifier : path.resolve(parent, specifier);
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      try {
        await fs.stat(candidate);
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      } catch {
        // Try next extension.
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const source = await fs.readFile(fileURLToPath(url), "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        moduleResolution: ts.ModuleResolutionKind.Bundler
      }
    }).outputText;
    return { format: "module", source: output, shortCircuit: true };
  }
  return nextLoad(url, context);
}
