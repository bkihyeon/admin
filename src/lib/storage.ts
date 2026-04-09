import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readJson<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content) as T;
}

export function writeJson<T>(filename: string, data: T): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  const tempPath = path.join(DATA_DIR, `${filename}.${crypto.randomUUID()}.tmp`);
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tempPath, filePath);
}

export function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}
