import { useTokens, useUpdateTokenStatus } from '@/hooks/useQueue';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TokenStatus } from '@/types/queue';
import { Phone, User, XCircle, UserX, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig: Record<TokenStatus, { label: string; className: string }> = {
  WAITING: { label: 'Waiting', className: 'status-waiting' },
  RUNNING: { label: 'In Progress', className: 'status-running' },
  COMPLETED: { label: 'Completed', className: 'status-completed' },
  CANCELLED: { label: 'Cancelled', className: 'status-cancelled' },
  NO_SHOW: { label: 'No Show', className: 'status-no-show' },
};

export function TokenTable() {
  const { data: tokens, isLoading } = useTokens();
  const updateStatus = useUpdateTokenStatus();
  
  const activeTokens = tokens?.filter(t => 
    t.status === 'WAITING' || t.status === 'RUNNING'
  ) || [];
  
  if (isLoading) {
    return (
      <div className="card-elevated p-8 text-center">
        <div className="animate-pulse">Loading queue...</div>
      </div>
    );
  }
  
  if (activeTokens.length === 0) {
    return (
      <div className="card-elevated p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No patients in queue</h3>
        <p className="text-muted-foreground">Patients will appear here when they request tokens</p>
      </div>
    );
  }
  
  return (
    <div className="card-elevated overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-20">Token</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeTokens.map((token) => {
            const config = statusConfig[token.status];
            return (
              <TableRow 
                key={token.id} 
                className={token.status === 'RUNNING' ? 'bg-primary/5' : ''}
              >
                <TableCell>
                  <span className="text-xl font-bold text-primary">
                    #{token.token_number}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-4 h-4 text-secondary-foreground" />
                    </div>
                    <span className="font-medium">{token.patient_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {token.phone_number}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(token.created_at), 'hh:mm a')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={config.className}>
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {token.status === 'RUNNING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-success border-success/30 hover:bg-success/10"
                        onClick={() => updateStatus.mutate({ id: token.id, status: 'COMPLETED' })}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Complete
                      </Button>
                    )}
                    {token.status === 'WAITING' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => updateStatus.mutate({ id: token.id, status: 'NO_SHOW' })}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          No Show
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatus.mutate({ id: token.id, status: 'CANCELLED' })}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
