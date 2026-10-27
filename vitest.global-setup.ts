import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const testDbPath = path.resolve(__dirname, "prisma/test.db");
const testDbUrl = `file:${testDbPath}`;

export default async function setup() {
  // Base de test propre a chaque run.
  for (const suffix of ["", "-journal"]) {
    const p = testDbPath + suffix;
    if (fs.existsSync(p)) fs.rmSync(p);
  }

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: __dirname,
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: "inherit",
  });

  return async function teardown() {
    for (const suffix of ["", "-journal"]) {
      const p = testDbPath + suffix;
      if (fs.existsSync(p)) fs.rmSync(p);
    }
  };
}
