import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { CurrentTokenDisplay } from '@/components/queue/CurrentTokenDisplay';
import { TokenTable } from '@/components/queue/TokenTable';
import { QueueControls } from '@/components/queue/QueueControls';
import { DoctorSettingsEditor } from '@/components/queue/DoctorSettingsEditor';
import { CompletedTokensList } from '@/components/queue/CompletedTokensList';
import { useRealtimeTokens } from '@/hooks/useQueue';

export default function Dashboard() {
  // Enable realtime updates
  useRealtimeTokens();
  
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container px-4 py-6 space-y-6">
        {/* Current Token & Stats */}
        <section>
          <CurrentTokenDisplay />
        </section>
        
        {/* Controls */}
        <section>
          <QueueControls />
        </section>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Queue Table - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold">Patient Queue</h2>
            <TokenTable />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <DoctorSettingsEditor />
            <CompletedTokensList />
          </div>
        </div>
      </main>
    </div>
  );
}
