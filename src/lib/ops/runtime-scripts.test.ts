/** @vitest-environment node */

import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

function createTemporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), "still-ops-"));
  temporaryDirectories.push(directory);
  return directory;
}

function runScript(script: string, environment: Record<string, string>) {
  return spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      BOOTSTRAP_ADMIN_ID: "",
      BOOTSTRAP_ADMIN_NAME: "",
      BOOTSTRAP_ADMIN_PASSWORD: "",
      ...environment,
    },
  });
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory) {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

describe("runtime environment validation", () => {
  it("fails safely when AUTH_PEPPER is too short", () => {
    const databasePath = join(createTemporaryDirectory(), "still.db");
    const result = runScript("scripts/validate-runtime.mjs", {
      AUTH_PEPPER: "do-not-print-this",
      STILL_DATABASE_PATH: databasePath,
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("AUTH_PEPPER");
    expect(`${result.stdout}${result.stderr}`).not.toContain("do-not-print-this");
  });

  it("accepts a valid secret and prepares a writable SQLite path", () => {
    const databasePath = join(createTemporaryDirectory(), "nested", "still.db");
    const result = runScript("scripts/validate-runtime.mjs", {
      AUTH_PEPPER: "a".repeat(32),
      STILL_DATABASE_PATH: databasePath,
    });

    expect(result.status, result.stderr).toBe(0);
    const database = new DatabaseSync(databasePath, { readOnly: true });
    expect(database.prepare("PRAGMA quick_check").get()).toEqual({ quick_check: "ok" });
    database.close();
  });

  it("rejects a partially configured bootstrap administrator", () => {
    const databasePath = join(createTemporaryDirectory(), "still.db");
    const result = runScript("scripts/validate-runtime.mjs", {
      AUTH_PEPPER: "a".repeat(32),
      BOOTSTRAP_ADMIN_ID: "20260001",
      STILL_DATABASE_PATH: databasePath,
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("BOOTSTRAP_ADMIN");
  });
});

describe("SQLite backup", () => {
  it("creates a verified point-in-time database copy", () => {
    const root = createTemporaryDirectory();
    const databasePath = join(root, "still.db");
    const backupDirectory = join(root, "backups");
    const database = new DatabaseSync(databasePath);
    database.exec("CREATE TABLE notes (id INTEGER PRIMARY KEY, title TEXT NOT NULL)");
    database.prepare("INSERT INTO notes (title) VALUES (?)").run("배포 전 백업");
    database.close();

    const result = runScript("scripts/backup-database.mjs", {
      STILL_BACKUP_DIR: backupDirectory,
      STILL_DATABASE_PATH: databasePath,
    });

    expect(result.status, result.stderr).toBe(0);
    const backupFiles = readdirSync(backupDirectory).filter((file) => file.endsWith(".db"));
    expect(backupFiles).toHaveLength(1);

    const backup = new DatabaseSync(join(backupDirectory, backupFiles[0]), { readOnly: true });
    expect(backup.prepare("SELECT title FROM notes").get()).toEqual({ title: "배포 전 백업" });
    expect(backup.prepare("PRAGMA quick_check").get()).toEqual({ quick_check: "ok" });
    backup.close();
  });

  it("does not create an empty backup when the source is missing", () => {
    const root = createTemporaryDirectory();
    const backupDirectory = join(root, "backups");
    const result = runScript("scripts/backup-database.mjs", {
      STILL_BACKUP_DIR: backupDirectory,
      STILL_DATABASE_PATH: join(root, "missing.db"),
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("존재하지 않습니다");
  });
});
