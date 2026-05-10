import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {/* PageHeader */}
      <Skeleton height={32} width={140} />

      {/* 추가 폼 */}
      <Card className="p-6">
        <Skeleton height={16} width={80} className="mb-3" />
        <div className="flex gap-3">
          <Skeleton height={36} className="flex-1" />
          <Skeleton height={36} width={112} />
          <Skeleton height={36} width={60} />
        </div>
      </Card>

      {/* 테이블 */}
      <Card>
        <div className="bg-surface-tertiary/50 px-5 py-3 flex gap-4">
          <Skeleton height={12} width={60} />
          <Skeleton height={12} width={40} className="ml-auto mr-32" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 py-4 px-5 border-b border-border-light last:border-0"
          >
            <Skeleton height={16} width={100} />
            <Skeleton height={20} width={40} className="ml-auto rounded-full" />
            <div className="flex gap-2 ml-4">
              <Skeleton height={28} width={60} />
              <Skeleton height={28} width={60} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
