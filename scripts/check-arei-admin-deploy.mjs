import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const adminDir = path.join(repoRoot, "arei-admin");
const adminPackagePath = path.join(adminDir, "package.json");
const adminVercelPath = path.join(adminDir, "vercel.json");

function fail(message) {
  console.error(`AREI admin deploy config error: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

if (!fs.existsSync(adminPackagePath)) {
  fail("missing arei-admin/package.json");
}

if (!fs.existsSync(adminVercelPath)) {
  fail("missing arei-admin/vercel.json");
}

const adminPackage = readJson(adminPackagePath);
const adminVercel = readJson(adminVercelPath);
const dependencies = adminPackage.dependencies ?? {};
const devDependencies = adminPackage.devDependencies ?? {};

if ("next" in dependencies || "next" in devDependencies) {
  fail("arei-admin must not declare Next.js; it is deployed as a Vite app");
}

if (!("vite" in devDependencies)) {
  fail("arei-admin must declare Vite in devDependencies");
}

if (adminPackage.scripts?.build !== "npx vite build") {
  fail('arei-admin build script must stay "npx vite build"');
}

if (adminVercel.framework !== null) {
  fail("arei-admin/vercel.json must set framework to null");
}

if (adminVercel.outputDirectory !== "dist") {
  fail('arei-admin/vercel.json must keep outputDirectory set to "dist"');
}

if (adminVercel.buildCommand !== "npm run build") {
  fail('arei-admin/vercel.json must keep buildCommand set to "npm run build"');
}

console.log("AREI admin deploy config looks correct.");
