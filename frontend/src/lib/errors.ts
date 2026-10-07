import type { Key } from "./prefs";

// แปลข้อความ error จาก API (เป็นภาษาอังกฤษ) ให้เป็นภาษาที่ผู้ใช้เลือก
const MAP: [RegExp, Key][] = [
  [/invalid email or password/i, "errLogin"],
  [/already registered/i, "errEmailTaken"],
  [/too many attempts/i, "errRate"],
  [/current password is incorrect/i, "errCurrentPw"],
  [/must be different/i, "errSamePw"],
  [/too common|guessable/i, "errPwWeak"],
  [/password must/i, "pwInvalid"],
  [/invalid or expired/i, "noToken"],
  [/category name already exists/i, "errCategoryDup"],
  [/file too large/i, "errFileBig"],
  [/file type not allowed/i, "errFileType"],
  [/too many files/i, "errFileCount"],
  [/not found/i, "errNotFound"],
  [/token|session/i, "errSession"],
  [/phone may contain/i, "errPhone"],
];

export function errText(e: unknown, t: (k: Key) => string): string {
  const msg = e instanceof Error ? e.message : "";
  if (!msg || msg === "network") return t("errNetwork");
  for (const [re, key] of MAP) if (re.test(msg)) return t(key);
  return /[\u0E00-\u0E7F]/.test(msg) ? msg : t("errGeneric");
}
