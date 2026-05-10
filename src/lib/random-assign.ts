import type {
  DutyAssignment,
  DutyItem,
  Employee,
  OfficeFreeEmployees,
} from "./types";

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function assignItemsFromPool(
  employees: Employee[],
  dutyItems: DutyItem[],
  officeId: string | null,
  officeName: string | null
): { assignments: DutyAssignment[]; freeEmployeeNames: string[] } {
  if (employees.length === 0 || dutyItems.length === 0) {
    return {
      assignments: [],
      freeEmployeeNames: employees.map((e) => e.name),
    };
  }

  const pool = shuffle([...employees]);
  let poolIndex = 0;

  const assignments = dutyItems.map((item) => {
    const assigned: Employee[] = [];

    for (let i = 0; i < item.requiredCount; i++) {
      if (poolIndex >= pool.length) {
        pool.push(...shuffle([...employees]));
      }
      assigned.push(pool[poolIndex]);
      poolIndex++;
    }

    return {
      dutyItemId: item.id,
      dutyItemName: item.name,
      officeId,
      officeName,
      assignedEmployeeIds: assigned.map((e) => e.id),
      assignedEmployeeNames: assigned.map((e) => e.name),
    };
  });

  const assignedIds = new Set(
    assignments.flatMap((a) => a.assignedEmployeeIds)
  );
  const freeEmployeeNames = employees
    .filter((e) => !assignedIds.has(e.id))
    .map((e) => e.name);

  return { assignments, freeEmployeeNames };
}

/** 단일 사무실 배정. 이미 해당 사무실로 필터된 사원/품목을 받는다. */
export function assignDutiesForOffice(
  employees: Employee[],
  dutyItems: DutyItem[],
  officeId: string,
  officeName: string
): { assignments: DutyAssignment[]; freeEmployee: OfficeFreeEmployees | null } {
  const { assignments, freeEmployeeNames } = assignItemsFromPool(
    employees,
    dutyItems,
    officeId,
    officeName
  );

  const freeEmployee =
    freeEmployeeNames.length > 0
      ? { officeId, officeName, employeeNames: freeEmployeeNames }
      : null;

  return { assignments, freeEmployee };
}
