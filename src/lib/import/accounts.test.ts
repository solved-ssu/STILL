import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { parseAccountWorkbook } from "./accounts";

async function workbookWith(rows: Array<Array<string | number>>) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("회원");
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("parseAccountWorkbook", () => {
  it("이름·학번·전화번호 열을 계정 등록 데이터로 변환한다", async () => {
    const file = await workbookWith([
      ["이름", "학번", "전화번호"],
      ["김알고", 20261234, "010-1234-5678"],
      ["이자료", 20261235, 1011112222],
    ]);

    const result = await parseAccountWorkbook(file);

    expect(result.issues).toEqual([]);
    expect(result.accounts).toEqual([
      { name: "김알고", studentId: "20261234", initialPassword: "01012345678" },
      { name: "이자료", studentId: "20261235", initialPassword: "01011112222" },
    ]);
  });

  it("필수 헤더가 없으면 파일 전체를 거부한다", async () => {
    const file = await workbookWith([
      ["이름", "전화번호"],
      ["김알고", "01012345678"],
    ]);

    await expect(parseAccountWorkbook(file)).rejects.toThrow("학번");
  });

  it("중복 학번과 잘못된 행은 제외하고 행 번호를 알려준다", async () => {
    const file = await workbookWith([
      ["name", "studentId", "phone"],
      ["김알고", "20261234", "01012345678"],
      ["다른 이름", "20261234", "01099998888"],
      ["", "20261236", "01012345678"],
    ]);

    const result = await parseAccountWorkbook(file);

    expect(result.accounts).toHaveLength(1);
    expect(result.issues.map((issue) => issue.row)).toEqual([3, 4]);
    expect(result.issues[0]?.message).toContain("중복");
  });

  it("빈 행을 무시하고 최대 행 수를 제한한다", async () => {
    const file = await workbookWith([
      ["이름", "학번", "전화번호"],
      ["", "", ""],
      ["김알고", "20261234", "01012345678"],
    ]);
    const result = await parseAccountWorkbook(file, { maxRows: 1 });
    expect(result.accounts).toHaveLength(1);
  });

  it("최대 행 수를 넘으면 처리를 중단한다", async () => {
    const file = await workbookWith([
      ["이름", "학번", "전화번호"],
      ["김알고", "20261234", "01012345678"],
      ["이자료", "20261235", "01011112222"],
    ]);
    await expect(parseAccountWorkbook(file, { maxRows: 1 })).rejects.toThrow("최대 1명");
  });
});
