import { Employee, RecyclingWeek } from "./types";

export function generateRecyclingSchedule(
  employees: Employee[],
  currentIndex: number
): { schedule: RecyclingWeek[]; nextIndex: number } {
  if (employees.length === 0) {
    return { schedule: [], nextIndex: 0 };
  }

  const schedule: RecyclingWeek[] = [];
  let index = currentIndex % employees.length;

  for (let week = 1; week <= 4; week++) {
    const assigned: Employee[] = [];
    for (let i = 0; i < 4; i++) {
      assigned.push(employees[index % employees.length]);
      index++;
    }

    schedule.push({
      weekNumber: week,
      assignedEmployeeIds: assigned.map((e) => e.id),
      assignedEmployeeNames: assigned.map((e) => e.name),
    });
  }

  return {
    schedule,
    nextIndex: index % employees.length,
  };
}
