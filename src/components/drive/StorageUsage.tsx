
import { Progress } from "@/components/ui/progress";
import { UserStorage, formatFileSize } from '@/utils/storageUtils';

interface StorageUsageProps {
  storage: UserStorage;
}

const StorageUsage = ({ storage }: StorageUsageProps) => {
  const usagePercentage = (storage.usedSpace / storage.totalSpace) * 100;
  
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">Storage</h3>
        <span className="text-sm text-muted-foreground">
          {formatFileSize(storage.usedSpace)} / {formatFileSize(storage.totalSpace)}
        </span>
      </div>
      <Progress value={usagePercentage} className="h-2" />
      <p className="text-xs text-muted-foreground mt-1 text-right">
        {usagePercentage.toFixed(2)}% used
      </p>
    </div>
  );
};

export default StorageUsage;
