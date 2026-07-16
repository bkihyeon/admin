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

export interface RevealState {
  cardIndex: number;
  isFlipped: boolean;
  flippedAt: string | null;
}

export interface CleaningDuty {
  id: string;
  month: string; // "2026-04" 형식
  officeId: string | null;
  version: number; // 같은 (month, office) 내 뽑기 회차. 재뽑기 시 증가, 이전 버전은 보존
  assignments: DutyAssignment[];
  freeEmployee: OfficeFreeEmployees | null;
  revealState: RevealState[];
  createdAt: string;
}

/** 특정 (month, office)의 한 버전 + 버전 메타. repository 조회 결과 단위 */
export interface DutyWithVersionMeta {
  duty: CleaningDuty;
  totalVersions: number;
  latestVersion: number;
}

export interface MaskedCard {
  cardIndex: number;
  employeeName: string;
  dutyItemName: string | null;
  isFree: boolean;
  isFlipped: boolean;
  flippedAt: string | null;
}

export interface MaskedDutyResponse {
  id: string;
  month: string;
  officeId: string | null;
  version: number;
  totalVersions: number;
  isLatest: boolean;
  cards: MaskedCard[];
  freeEmployee: OfficeFreeEmployees | null;
  allFlipped: boolean;
  createdAt: string;
}

export interface DutiesPage {
  items: MaskedDutyResponse[];
  hasMore: boolean;
  nextCursor: string | null;
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
