/**
 * Syncs variables from .env.local to Vercel (production + development).
 * Preview deployments: add vars in the Vercel dashboard or pass a Git branch:
 *   npx vercel env add KEY preview <branch> --value "..." --yes --force
 *
 * Usage: node scripts/push-vercel-env.mjs
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const text = readFileSync(join(root, ".env.local"), "utf8");
const vars = {};
for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)="([^"]*)"$/);
  if (m) vars[m[1]] = m[2];
}

const order = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_MAPBOX_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const targets = ["production", "development"];

for (const target of targets) {
  for (const name of order) {
    const value = vars[name];
    if (!value) continue;
    if (name === "SUPABASE_SERVICE_ROLE_KEY" && target === "development") {
      // Vercel disallows sensitive vars on Development; use .env.local for vercel dev.
      continue;
    }
    const args = [
      "vercel",
      "env",
      "add",
      name,
      target,
      "--value",
      value,
      "--yes",
      "--force",
    ];
    if (name === "SUPABASE_SERVICE_ROLE_KEY") args.push("--sensitive");
    const r = spawnSync("npx", ["--yes", ...args], {
      cwd: root,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, CI: "1" },
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}
