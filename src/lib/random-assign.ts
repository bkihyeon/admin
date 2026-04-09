import { Employee, DutyItem, DutyAssignment } from "./types";

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function assignDuties(
  employees: Employee[],
  dutyItems: DutyItem[]
): DutyAssignment[] {
  if (employees.length === 0 || dutyItems.length === 0) {
    return [];
  }

  const pool = shuffle([...employees]);
  let poolIndex = 0;

  return dutyItems.map((item) => {
    const assigned: Employee[] = [];

    for (let i = 0; i < item.requiredCount; i++) {
      if (poolIndex >= pool.length) {
        // 풀 소진 시 전체 사원에서 다시 셔플 (다른 항목 간 중복 허용)
        pool.push(...shuffle([...employees]));
      }
      assigned.push(pool[poolIndex]);
      poolIndex++;
    }

    return {
      dutyItemId: item.id,
      dutyItemName: item.name,
      assignedEmployeeIds: assigned.map((e) => e.id),
      assignedEmployeeNames: assigned.map((e) => e.name),
    };
  });
}
