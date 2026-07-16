export const queryKeys = {
  offices: ["offices"] as const,
  employees: (officeId: string | null) => ["employees", officeId] as const,
  dutyItems: (officeId: string | null) => ["duty-items", officeId] as const,
  duties: (officeId: string | null, month?: string) =>
    month
      ? (["duties", officeId, month] as const)
      : (["duties", officeId] as const),
  // 특정 버전 조회 (최신 추적용 duties 키와 분리 — 폴링에 안 섞임)
  dutyVersion: (officeId: string | null, month: string, version: number) =>
    ["duty-version", officeId, month, version] as const,
  dutiesPage: (officeId: string | null) => ["duties-page", officeId] as const,
  recycling: ["recycling"] as const,
};
