import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useDoctorSettings } from '@/hooks/useQueue';
import { LogOut, Stethoscope } from 'lucide-react';

export function DashboardHeader() {
  const { signOut, user } = useAuth();
  const { data: settings } = useDoctorSettings();
  
  const handleSignOut = async () => {
    await signOut();
  };
  
  return (
    <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">{settings?.clinic_name || 'Clinic'}</h1>
            <p className="text-xs text-muted-foreground">Queue Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {user?.email}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
