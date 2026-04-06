import fs from "fs";
import path from "path";

const VAULT_FOLDERS = ["inbox", "projects", "areas", "resources", "archive"];

export function getVaultPath(): string {
  return process.env.KB_VAULT_PATH ?? path.join(process.cwd(), "kb-vault");
}

export function ensureVault(): string {
  const vaultPath = getVaultPath();
  const absolute = path.isAbsolute(vaultPath) ? vaultPath : path.join(process.cwd(), vaultPath);

  if (!fs.existsSync(absolute)) {
    fs.mkdirSync(absolute, { recursive: true });
  }

  for (const folder of VAULT_FOLDERS) {
    const folderPath = path.join(absolute, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
  }

  return absolute;
}

export function resolveNotePath(slugs: string[]): string {
  const vaultPath = ensureVault();
  return path.join(vaultPath, ...slugs);
}
