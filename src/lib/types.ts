export interface Employee {
  id: string;
  name: string;
  createdAt: string;
}

export interface DutyItem {
  id: string;
  name: string;
  requiredCount: number;
}

export interface DutyAssignment {
  dutyItemId: string;
  dutyItemName: string;
  assignedEmployeeIds: string[];
  assignedEmployeeNames: string[];
}

export interface CleaningDuty {
  id: string;
  month: string; // "2026-04" 형식
  assignments: DutyAssignment[];
  freeEmployeeNames: string[];
  createdAt: string;
}

export interface RecyclingWeek {
  weekNumber: number;
  assignedEmployeeIds: string[];
  assignedEmployeeNames: string[];
}

export interface RecyclingState {
  currentIndex: number;
  schedule: RecyclingWeek[];
  updatedAt: string;
}
