import type { CleaningDuty, MaskedCard } from "@/lib/types";

export interface EmployeeCard {
  cardIndex: number;
  employeeName: string;
  dutyItemName: string;
  isFree: boolean;
}

// 서버/클라이언트 공유 평탄화 규칙. revealState.length === buildCards(duty).length 불변.
export function buildCards(
  duty: Pick<CleaningDuty, "assignments" | "freeEmployee">,
): EmployeeCard[] {
  const out: EmployeeCard[] = [];
  let i = 0;
  for (const a of duty.assignments) {
    for (const name of a.assignedEmployeeNames) {
      out.push({
        cardIndex: i,
        employeeName: name,
        dutyItemName: a.dutyItemName,
        isFree: false,
      });
      i++;
    }
  }
  if (duty.freeEmployee) {
    for (const name of duty.freeEmployee.employeeNames) {
      out.push({
        cardIndex: i,
        employeeName: name,
        dutyItemName: "프리",
        isFree: true,
      });
      i++;
    }
  }
  return out;
}

export interface AssignmentGroup {
  name: string;
  isFree: boolean;
  employees: string[];
}

// dashboard / duties / history에서 결과 카드 표시용 그룹핑. 같은 dutyItemName끼리 묶고 free는 단일 그룹.
export function groupCardsByItem(cards: MaskedCard[]): AssignmentGroup[] {
  const m = new Map<string, AssignmentGroup>();
  for (const c of cards) {
    const key = c.isFree ? "__free__" : (c.dutyItemName ?? "");
    if (!m.has(key)) {
      m.set(key, { name: c.dutyItemName ?? "", isFree: c.isFree, employees: [] });
    }
    m.get(key)!.employees.push(c.employeeName);
  }
  return Array.from(m.values());
}
