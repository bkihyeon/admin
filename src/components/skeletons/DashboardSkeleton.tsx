import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-4">
              <Skeleton height={40} width={40} className="rounded-lg" />
              <div className="space-y-2">
                <Skeleton height={12} width={60} />
                <Skeleton height={28} width={40} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Skeleton height={20} width={20} className="rounded" />
          <Skeleton height={20} width={140} />
          <Skeleton height={20} width={60} className="rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-primary-100 p-4 space-y-2"
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
