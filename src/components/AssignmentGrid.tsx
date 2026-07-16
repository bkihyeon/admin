import Badge from "@/components/ui/Badge";
import { groupCardsByItem } from "@/lib/duties/cards";
import type { MaskedCard, OfficeFreeEmployees } from "@/lib/types";

interface AssignmentGridProps {
  cards: MaskedCard[];
  freeEmployee: OfficeFreeEmployees | null;
}

/** 항목별 배정 결과 그리드 + 프리 명단. 이력 피드·이전 버전 보기 공용 */
export default function AssignmentGrid({
  cards,
  freeEmployee,
}: AssignmentGridProps) {
  const dutyItemGroups = groupCardsByItem(cards).filter((g) => !g.isFree);
  const freeEmployeeNames = freeEmployee?.employeeNames ?? [];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dutyItemGroups.map((g) => (
          <div
            key={g.name}
            className="rounded-lg bg-surface-secondary border border-border-light p-4"
          >
            <div className="text-sm font-semibold text-text-primary mb-2">
              {g.name}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.employees.map((name) => (
                <Badge key={name} variant="neutral">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      {freeEmployeeNames.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-tertiary font-medium">프리:</span>
          {freeEmployeeNames.map((name) => (
            <Badge key={name} variant="neutral">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </>
  );
}
