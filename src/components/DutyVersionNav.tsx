import { ChevronLeft, ChevronRight } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface DutyVersionNavProps {
  version: number; // 현재 보고 있는 버전
  totalVersions: number;
  onChange: (version: number) => void;
}

/** 같은 월의 뽑기 버전을 앞뒤로 탐색. 버전이 2개 이상일 때만 렌더할 것 */
export default function DutyVersionNav({
  version,
  totalVersions,
  onChange,
}: DutyVersionNavProps) {
  return (
    <div className="flex items-center gap-2" data-testid="version-nav">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(version - 1)}
        disabled={version <= 1}
        aria-label="이전 버전"
        data-testid="version-prev"
      >
        <ChevronLeft size={14} />
      </Button>
      <span
        className="text-xs text-text-secondary font-medium tabular-nums"
        data-testid="version-label"
      >
        {version}번째 뽑기 / 총 {totalVersions}회
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(version + 1)}
        disabled={version >= totalVersions}
        aria-label="다음 버전"
        data-testid="version-next"
      >
        <ChevronRight size={14} />
      </Button>
      {version < totalVersions && <Badge variant="neutral">이전 버전</Badge>}
    </div>
  );
}
