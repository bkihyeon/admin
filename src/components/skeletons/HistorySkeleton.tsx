import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function HistorySkeleton() {
  return (
    <div className="space-y-6">
      {/* PageHeader */}
      <Skeleton height={32} width={100} />

      {/* 월 탭 */}
      <div className="flex gap-2 flex-wrap">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={36} width={80} className="rounded-full" />
        ))}
      </div>

      {/* 배정 카드 */}
      <Card className="p-6">
        <Skeleton height={20} width={160} className="mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border-light p-4 space-y-2"
            >
              <Skeleton height={16} width={80} />
              <div className="flex gap-1.5">
                <Skeleton height={20} width={48} className="rounded-full" />
                <Skeleton height={20} width={48} className="rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
