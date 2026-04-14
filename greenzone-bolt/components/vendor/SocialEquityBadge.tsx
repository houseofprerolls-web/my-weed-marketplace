import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function SocialEquityBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0 border-amber-600/45 bg-amber-950/35 text-amber-100/95 font-medium',
        className
      )}
    >
      Social equity
    </Badge>
  );
}
