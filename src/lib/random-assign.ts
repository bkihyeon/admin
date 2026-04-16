import { Employee, DutyItem, DutyAssignment, Office, OfficeFreeEmployees } from "./types";

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

  const assignedIds = new Set(assignments.flatMap((a) => a.assignedEmployeeIds));
  const freeEmployeeNames = employees
    .filter((e) => !assignedIds.has(e.id))
    .map((e) => e.name);

  return { assignments, freeEmployeeNames };
}

/** 사무실별 독립 배정. 각 사무실의 사원 풀에서 해당 사무실 품목에 배정. */
export function assignDuties(
  employees: Employee[],
  dutyItems: DutyItem[],
  offices: Office[]
): { assignments: DutyAssignment[]; freeEmployees: OfficeFreeEmployees[] } {
  const officeMap = new Map(offices.map((o) => [o.id, o.name]));

  // officeId 기준으로 그룹핑 (null = 미분류)
  const officeIds = new Set<string | null>();
  for (const e of employees) officeIds.add(e.officeId);
  for (const d of dutyItems) officeIds.add(d.officeId);

  const allAssignments: DutyAssignment[] = [];
  const allFreeEmployees: OfficeFreeEmployees[] = [];

  for (const oid of officeIds) {
    const officeEmployees = employees.filter((e) => e.officeId === oid);
    const officeItems = dutyItems.filter((d) => d.officeId === oid);
    const officeName = oid ? (officeMap.get(oid) ?? null) : null;

    const { assignments, freeEmployeeNames } = assignItemsFromPool(
      officeEmployees,
      officeItems,
      oid,
      officeName
    );

    allAssignments.push(...assignments);

    if (freeEmployeeNames.length > 0) {
      allFreeEmployees.push({
        officeId: oid,
        officeName,
        employeeNames: freeEmployeeNames,
      });
    }
  }

  return { assignments: allAssignments, freeEmployees: allFreeEmployees };
}

/** 단일 사무실 배정. 해당 사무실 사원/품목만 대상. */
export function assignDutiesForOffice(
  employees: Employee[],
  dutyItems: DutyItem[],
  officeId: string,
  officeName: string
): { assignments: DutyAssignment[]; freeEmployees: OfficeFreeEmployees | null } {
  const officeEmployees = employees.filter((e) => e.officeId === officeId);
  const officeItems = dutyItems.filter((d) => d.officeId === officeId);

  const { assignments, freeEmployeeNames } = assignItemsFromPool(
    officeEmployees,
    officeItems,
    officeId,
    officeName
  );

  const freeEmployees =
    freeEmployeeNames.length > 0
      ? { officeId, officeName, employeeNames: freeEmployeeNames }
      : null;

  return { assignments, freeEmployees };
}
