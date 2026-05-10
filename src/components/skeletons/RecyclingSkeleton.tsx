import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function RecyclingSkeleton() {
  return (
    <div className="space-y-6">
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

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Skeleton height={18} width={18} className="rounded mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <Skeleton height={14} width={100} />
            <Skeleton height={14} className="w-full" />
            <Skeleton height={14} width={200} />
          </div>
        </div>
      </Card>
    </div>
  );
}
