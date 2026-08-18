import ExcelJS from "exceljs";

import { phonePasswordSchema, studentIdSchema } from "@/lib/auth/validation";

export interface AccountImportRow {
  name: string;
  studentId: string;
  initialPassword: string;
}

export interface AccountImportIssue {
  row: number;
  message: string;
}

export interface AccountImportResult {
  accounts: AccountImportRow[];
  issues: AccountImportIssue[];
}

const headerAliases = {
  name: ["이름", "성명", "name"],
  studentId: ["학번", "studentid", "student_id", "id"],
  phone: ["전화번호", "휴대전화", "핸드폰", "phone", "phonenumber"],
} as const;

function normalizedCellText(cell: ExcelJS.Cell): string {
  return cell.text.trim();
}

function normalizedHeader(cell: ExcelJS.Cell): string {
  return normalizedCellText(cell).toLowerCase().replace(/[\s-]/g, "");
}

function findColumn(headers: Map<string, number>, aliases: readonly string[], label: string): number {
  for (const alias of aliases) {
    const column = headers.get(alias.toLowerCase().replace(/[\s-]/g, ""));
    if (column) return column;
  }
  throw new Error(`필수 열 '${label}'을 찾을 수 없습니다.`);
}

export async function parseAccountWorkbook(
  input: Buffer,
  options: { maxRows?: number } = {},
): Promise<AccountImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(input as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("엑셀 파일에 워크시트가 없습니다.");

  const headers = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => headers.set(normalizedHeader(cell), column));

  const nameColumn = findColumn(headers, headerAliases.name, "이름");
  const studentIdColumn = findColumn(headers, headerAliases.studentId, "학번");
  const phoneColumn = findColumn(headers, headerAliases.phone, "전화번호");
  const maxRows = options.maxRows ?? 2_000;
  const accounts: AccountImportRow[] = [];
  const issues: AccountImportIssue[] = [];
  const seenIds = new Set<string>();
  let nonEmptyRows = 0;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const name = normalizedCellText(row.getCell(nameColumn));
    const rawStudentId = normalizedCellText(row.getCell(studentIdColumn));
    const rawPhone = normalizedCellText(row.getCell(phoneColumn));
    if (!name && !rawStudentId && !rawPhone) continue;

    nonEmptyRows += 1;
    if (nonEmptyRows > maxRows) {
      throw new Error(`한 번에 최대 ${maxRows.toLocaleString("ko-KR")}명까지 등록할 수 있습니다.`);
    }

    const parsedStudentId = studentIdSchema.safeParse(rawStudentId);
    const parsedPhone = phonePasswordSchema.safeParse(rawPhone);
    const messages: string[] = [];
    if (!name) messages.push("이름이 비어 있습니다.");
    if (!parsedStudentId.success) messages.push(parsedStudentId.error.issues[0]?.message ?? "학번 형식이 잘못되었습니다.");
    if (!parsedPhone.success) messages.push(parsedPhone.error.issues[0]?.message ?? "전화번호 형식이 잘못되었습니다.");

    if (parsedStudentId.success && seenIds.has(parsedStudentId.data)) {
      messages.push("파일 안에 중복된 학번이 있습니다.");
    }

    if (messages.length > 0 || !parsedStudentId.success || !parsedPhone.success) {
      issues.push({ row: rowNumber, message: messages.join(" ") });
      continue;
    }

    seenIds.add(parsedStudentId.data);
    accounts.push({
      name,
      studentId: parsedStudentId.data,
      initialPassword: parsedPhone.data,
    });
  }

  return { accounts, issues };
}
