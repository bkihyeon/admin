export const queryKeys = {
  offices: ["offices"] as const,
  employees: (officeId: string | null) => ["employees", officeId] as const,
  dutyItems: (officeId: string | null) => ["duty-items", officeId] as const,
  duties: (officeId: string | null, month?: string) =>
    month
      ? (["duties", officeId, month] as const)
      : (["duties", officeId] as const),
  recycling: ["recycling"] as const,
};
