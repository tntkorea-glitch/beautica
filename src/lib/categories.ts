/** 뷰티샵 시술 카테고리 프리셋 — ServiceForm + ProfileForm 공용 */
export const BASE_CATEGORY_PRESETS = [
  "헤어",
  "네일",
  "반영구",
  "속눈썹펌",
  "속눈썹연장",
  "LED속눈썹연장",
  "스킨케어",
  "메디컬에스테틱",
  "왁싱",
  "슈가링왁싱",
  "메이크업",
  "발관리",
  "기타",
] as const;

export type BaseCategory = (typeof BASE_CATEGORY_PRESETS)[number];
