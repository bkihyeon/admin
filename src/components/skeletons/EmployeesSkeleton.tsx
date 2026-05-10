import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function EmployeesSkeleton() {
  return (
    <div className="space-y-6">
      {/* PageHeader */}
      <div className="flex items-center gap-3">
        <Skeleton height={32} width={120} />
        <Skeleton height={24} width={50} className="rounded-full" />
      </div>

      {/* 등록 폼 */}
      <Card className="p-6">
        <Skeleton height={16} width={80} className="mb-3" />
        <div className="flex gap-3">
          <Skeleton height={36} className="flex-1" />
          <Skeleton height={36} width={60} />
        </div>
      </Card>

      {/* 테이블 */}
      <Card>
        <div className="p-0">
          <div className="bg-surface-tertiary/50 px-5 py-3 flex gap-4">
            <Skeleton height={12} width={40} />
            <Skeleton height={12} width={60} />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-4 px-5 border-b border-border-light last:border-0"
            >
              <Skeleton height={14} width={24} />
              <Skeleton height={16} width={80} />
              <Skeleton height={14} width={60} className="ml-auto" />
              <div className="flex gap-2">
                <Skeleton height={28} width={60} />
                <Skeleton height={28} width={60} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
