import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function DutiesSkeleton() {
  return (
    <div className="space-y-6">
      {/* PageHeader */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton height={32} width={120} />
          <Skeleton height={24} width={70} className="rounded-full" />
        </div>
        <Skeleton height={44} width={100} className="rounded-lg" />
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton height={16} width={90} className="mb-3 pb-3" />
            <div className="flex flex-wrap gap-1.5">
              <Skeleton height={20} width={52} className="rounded-full" />
              <Skeleton height={20} width={52} className="rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
