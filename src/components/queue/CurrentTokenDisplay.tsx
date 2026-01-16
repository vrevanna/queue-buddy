import { useQueueState, useTokens } from '@/hooks/useQueue';
import { Users, Clock, CheckCircle } from 'lucide-react';

export function CurrentTokenDisplay() {
  const { data: queueState } = useQueueState();
  const { data: tokens } = useTokens();
  
  const runningToken = tokens?.find(t => t.status === 'RUNNING');
  const waitingCount = tokens?.filter(t => t.status === 'WAITING').length || 0;
  const completedCount = tokens?.filter(t => t.status === 'COMPLETED').length || 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Current Token - Large Display */}
      <div className="md:col-span-2 token-display p-6">
        <div className="text-center">
          <p className="text-primary-foreground/80 text-sm font-medium uppercase tracking-wider mb-2">
            Now Serving
          </p>
          <div className="text-7xl font-bold mb-2">
            {runningToken ? `#${runningToken.token_number}` : '—'}
          </div>
          {runningToken && (
            <p className="text-primary-foreground/90 text-lg">
              {runningToken.patient_name}
            </p>
          )}
          {!runningToken && (
            <p className="text-primary-foreground/70 text-sm">
              No patient currently being served
            </p>
          )}
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="stats-card flex flex-col justify-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold">{waitingCount}</p>
            <p className="text-sm text-muted-foreground">Waiting</p>
          </div>
        </div>
      </div>
      
      <div className="stats-card flex flex-col justify-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
