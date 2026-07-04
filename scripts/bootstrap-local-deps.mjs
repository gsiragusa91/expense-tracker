import { cp, lstat, mkdir, readdir, readlink, rm, stat, symlink, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const nodeModules = path.join(root, "node_modules");
const pachitAppModules = "/Users/gsiragusa/Pachita Playground/PachitApp/node_modules";
const babyModules = "/Users/gsiragusa/Pachita Playground/Baby's Project/node_modules";

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function copyDir(from, to) {
  if (!(await exists(from))) {
    throw new Error(`No existe ${from}`);
  }
  await cp(from, to, { recursive: true, force: true });
}

async function relinkAbsoluteBins(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".bin") {
        await relinkBinDirectory(fullPath);
      } else {
        await relinkAbsoluteBins(fullPath);
      }
    }
  }
}

async function relinkBinDirectory(binDir) {
  const entries = await readdir(binDir);
  for (const entry of entries) {
    const linkPath = path.join(binDir, entry);
    const stats = await lstat(linkPath);
    if (!stats.isSymbolicLink()) continue;

    const target = await readlink(linkPath);
    if (!path.isAbsolute(target)) continue;

    const marker = `${path.sep}node_modules${path.sep}`;
    const markerIndex = target.lastIndexOf(marker);
    if (markerIndex === -1) continue;

    const packagePath = target.slice(markerIndex + marker.length);
    const localTarget = path.join(nodeModules, packagePath);
    const relativeTarget = path.relative(binDir, localTarget);
    await unlink(linkPath);
    await symlink(relativeTarget, linkPath);
  }
}

await mkdir(nodeModules, { recursive: true });

console.log("Copying base dependencies from PachitApp...");
await copyDir(pachitAppModules, nodeModules);

console.log("Adding lucide-react from Baby's Project...");
await rm(path.join(nodeModules, "lucide-react"), { recursive: true, force: true });
await copyDir(path.join(babyModules, "lucide-react"), path.join(nodeModules, "lucide-react"));

const pdfjsPath = path.join(nodeModules, "pdfjs-dist");
if (!(await exists(pdfjsPath))) {
  console.warn(
    "pdfjs-dist is not installed locally. The app runs, but PDF text extraction needs `npm install` when registry access works."
  );
}

await relinkAbsoluteBins(nodeModules);

if (process.platform === "darwin") {
  spawnSync("xattr", ["-cr", nodeModules], { stdio: "ignore" });
}

console.log("Local dependency bootstrap complete.");
