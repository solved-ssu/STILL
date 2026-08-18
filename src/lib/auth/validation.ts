import { z } from "zod";

export function normalizeStudentId(value: unknown): string {
  return String(value ?? "").trim();
}

export function normalizePhone(value: unknown): string {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("10")) digits = `0${digits}`;
  return digits;
}

export const studentIdSchema = z
  .unknown()
  .transform(normalizeStudentId)
  .pipe(z.string().regex(/^\d{4,20}$/, "학번은 4~20자리 숫자여야 합니다."));

export const phonePasswordSchema = z
  .unknown()
  .transform(normalizePhone)
  .pipe(z.string().regex(/^010\d{8}$/, "전화번호는 010으로 시작하는 11자리여야 합니다."));

function normalizeLoginPassword(value: unknown): string {
  const password = String(value ?? "");
  return /^[\d\s()-]+$/.test(password) ? normalizePhone(password) : password;
}

const loginPasswordSchema = z
  .unknown()
  .transform(normalizeLoginPassword)
  .pipe(z.string().min(1).max(128))
  .superRefine((password, context) => {
    if (/^\d+$/.test(password) && !/^010\d{8}$/.test(password)) {
      context.addIssue({
        code: "custom",
        message: "초기 비밀번호는 010으로 시작하는 11자리여야 합니다.",
      });
    }
  });

const newPasswordSchema = z
  .string()
  .min(10, "새 비밀번호는 10자 이상이어야 합니다.")
  .max(128, "새 비밀번호는 128자 이하여야 합니다.")
  .regex(/^\S+$/, "비밀번호에는 공백을 사용할 수 없습니다.")
  .regex(/\p{L}/u, "새 비밀번호에는 문자를 포함해야 합니다.")
  .regex(/\d/, "새 비밀번호에는 숫자를 포함해야 합니다.");

export const loginSchema = z.object({
  studentId: studentIdSchema,
  password: loginPasswordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: loginPasswordSchema,
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1).max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "새 비밀번호 확인이 일치하지 않습니다.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "현재 비밀번호와 다른 비밀번호를 사용해 주세요.",
    path: ["newPassword"],
  });
