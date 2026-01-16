import { useTokens } from '@/hooks/useQueue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { TokenStatus } from '@/types/queue';

const statusIcons: Record<string, React.ElementType> = {
  COMPLETED: CheckCircle,
  CANCELLED: XCircle,
  NO_SHOW: UserX,
};

const statusLabels: Record<string, string> = {
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

export function CompletedTokensList() {
  const { data: tokens } = useTokens();
  
  const completedTokens = tokens?.filter(t => 
    t.status === 'COMPLETED' || t.status === 'CANCELLED' || t.status === 'NO_SHOW'
  ).reverse() || [];
  
  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Today's History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {completedTokens.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No completed tokens yet
            </div>
          ) : (
            <div className="divide-y">
              {completedTokens.map((token) => {
                const Icon = statusIcons[token.status];
                return (
                  <div key={token.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-muted-foreground">
                        #{token.token_number}
                      </span>
                      <span className="text-sm">{token.patient_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(token.created_at), 'hh:mm a')}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={
                          token.status === 'COMPLETED' ? 'status-completed' :
                          token.status === 'CANCELLED' ? 'status-cancelled' : 'status-no-show'
                        }
                      >
                        <Icon className="w-3 h-3 mr-1" />
                        {statusLabels[token.status]}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
