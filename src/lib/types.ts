export interface Office {
  id: string;
  name: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  officeId: string | null;
  createdAt: string;
}

export interface DutyItem {
  id: string;
  name: string;
  requiredCount: number;
  officeId: string | null;
}

export interface DutyAssignment {
  dutyItemId: string;
  dutyItemName: string;
  officeId: string | null;
  officeName: string | null;
  assignedEmployeeIds: string[];
  assignedEmployeeNames: string[];
}

export interface OfficeFreeEmployees {
  officeId: string | null;
  officeName: string | null;
  employeeNames: string[];
}

export interface CleaningDuty {
  id: string;
  month: string; // "2026-04" 형식
  officeId: string | null;
  assignments: DutyAssignment[];
  freeEmployee: OfficeFreeEmployees | null;
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
