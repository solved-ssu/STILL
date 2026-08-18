import { existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";

const sourcePath = resolve(
  process.cwd(),
  process.env.STILL_DATABASE_PATH ?? "data/still.db",
);
const backupDirectory = resolve(
  process.cwd(),
  process.env.STILL_BACKUP_DIR ?? "backups",
);

if (!existsSync(sourcePath)) {
  console.error("[STILL] 원본 SQLite 데이터베이스가 존재하지 않습니다.");
  process.exitCode = 1;
} else {
  mkdirSync(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
  const destinationPath = resolve(backupDirectory, `still-${timestamp}-${process.pid}.db`);
  let sourceDatabase;
  let destinationDatabase;

  try {
    sourceDatabase = new DatabaseSync(sourcePath, { readOnly: true });
    const sourceCheck = sourceDatabase.prepare("PRAGMA quick_check").get();
    if (sourceCheck?.quick_check !== "ok") {
      throw new Error("원본 SQLite 무결성 검사에 실패했습니다.");
    }

    const copiedPages = await backup(sourceDatabase, destinationPath);
    destinationDatabase = new DatabaseSync(destinationPath, { readOnly: true });
    const destinationCheck = destinationDatabase.prepare("PRAGMA quick_check").get();
    if (destinationCheck?.quick_check !== "ok") {
      throw new Error("백업 SQLite 무결성 검사에 실패했습니다.");
    }

    console.log(`[STILL] 백업 완료 (${copiedPages} pages): ${destinationPath}`);
  } catch (error) {
    destinationDatabase?.close();
    destinationDatabase = undefined;
    if (existsSync(destinationPath)) {
      rmSync(destinationPath, { force: true });
    }
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error(`[STILL] 백업 실패: ${message}`);
    process.exitCode = 1;
  } finally {
    destinationDatabase?.close();
    sourceDatabase?.close();
  }
}
