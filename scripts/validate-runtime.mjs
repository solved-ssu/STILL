import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const issues = [];
const authPepper = process.env.AUTH_PEPPER ?? "";

if (authPepper.length < 32) {
  issues.push("AUTH_PEPPER는 32자 이상의 비밀값이어야 합니다.");
}

const bootstrap = {
  id: process.env.BOOTSTRAP_ADMIN_ID?.trim() ?? "",
  name: process.env.BOOTSTRAP_ADMIN_NAME?.trim() ?? "",
  password: process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "",
};
const configuredBootstrapFields = Object.values(bootstrap).filter(Boolean).length;

if (configuredBootstrapFields > 0 && configuredBootstrapFields < 3) {
  issues.push("BOOTSTRAP_ADMIN_* 값은 세 항목을 모두 설정하거나 모두 비워야 합니다.");
} else if (configuredBootstrapFields === 3) {
  if (!/^\d{4,20}$/.test(bootstrap.id)) {
    issues.push("BOOTSTRAP_ADMIN_ID는 4~20자리 숫자여야 합니다.");
  }
  if (bootstrap.name.length > 100) {
    issues.push("BOOTSTRAP_ADMIN_NAME은 100자 이하여야 합니다.");
  }
  if (bootstrap.password.length > 128) {
    issues.push("BOOTSTRAP_ADMIN_PASSWORD는 128자 이하여야 합니다.");
  }
  if (/^\d+$/.test(bootstrap.password) && !/^010\d{8}$/.test(bootstrap.password)) {
    issues.push("숫자형 BOOTSTRAP_ADMIN_PASSWORD는 010으로 시작하는 11자리여야 합니다.");
  }
}

let database;
if (issues.length === 0) {
  try {
    const databasePath = resolve(
      process.cwd(),
      process.env.STILL_DATABASE_PATH ?? "data/still.db",
    );
    mkdirSync(dirname(databasePath), { recursive: true });
    database = new DatabaseSync(databasePath);
    const result = database.prepare("PRAGMA quick_check").get();
    if (result?.quick_check !== "ok") {
      issues.push("STILL_DATABASE_PATH의 SQLite 무결성 검사에 실패했습니다.");
    }
  } catch {
    issues.push("STILL_DATABASE_PATH를 만들거나 열 수 없습니다.");
  } finally {
    database?.close();
  }
}

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`[STILL] ${issue}`);
  }
  process.exitCode = 1;
} else {
  console.log("[STILL] 런타임 설정과 SQLite 저장 경로를 확인했습니다.");
}
