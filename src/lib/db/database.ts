import "server-only";

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { initializeDatabase } from "./schema";

declare global {
  var stillDatabase: DatabaseSync | undefined;
  var stillDatabaseSchemaVersion: number | undefined;
}

const SCHEMA_VERSION = 4;

function openDatabase(): DatabaseSync {
  const databasePath = resolve(/* turbopackIgnore: true */ process.cwd(), process.env.STILL_DATABASE_PATH ?? "data/still.db");
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA busy_timeout = 5000;");
  initializeDatabase(database);
  return database;
}

export function getDatabase(): DatabaseSync {
  if (!globalThis.stillDatabase) {
    globalThis.stillDatabase = openDatabase();
    globalThis.stillDatabaseSchemaVersion = SCHEMA_VERSION;
  } else if (globalThis.stillDatabaseSchemaVersion !== SCHEMA_VERSION) {
    initializeDatabase(globalThis.stillDatabase, { seedContent: false });
    globalThis.stillDatabaseSchemaVersion = SCHEMA_VERSION;
  }
  return globalThis.stillDatabase;
}
