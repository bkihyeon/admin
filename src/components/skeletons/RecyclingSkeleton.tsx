import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function RecyclingSkeleton() {
  return (
    <div className="space-y-6">
      {/* PageHeader */}
      <div className="flex items-center justify-between">
        <Skeleton height={32} width={140} />
        <Skeleton height={44} width={160} className="rounded-lg" />
      </div>

      {/* 4주차 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden">
            <div className="bg-success-50 px-5 py-3 border-b border-success-100">
              <Skeleton height={16} width={50} />
            </div>
            <div className="p-4 flex flex-wrap gap-1.5">
              <Skeleton height={20} width={52} className="rounded-full" />
              <Skeleton height={20} width={52} className="rounded-full" />
              <Skeleton height={20} width={52} className="rounded-full" />
              <Skeleton height={20} width={52} className="rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
