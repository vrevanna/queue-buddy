import { useDoctorSettings } from '@/hooks/useQueue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Stethoscope, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function formatTime(time: string) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function DoctorSettingsCard() {
  const { data: settings, isLoading } = useDoctorSettings();
  
  if (isLoading || !settings) {
    return (
      <Card className="card-elevated animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            {settings.clinic_name}
          </CardTitle>
          <Badge variant={settings.is_active ? 'default' : 'secondary'}>
            {settings.is_active ? 'Open' : 'Closed'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Doctor Hours</p>
            <p className="text-sm text-muted-foreground">
              Morning: {formatTime(settings.start_time_morning)} – {formatTime(settings.end_time_morning)}
            </p>
            <p className="text-sm text-muted-foreground">
              Evening: {formatTime(settings.start_time_evening)} – {formatTime(settings.end_time_evening)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Timer className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium">Avg. Consultation Time</p>
            <p className="text-sm text-muted-foreground">{settings.avg_consultation_time} minutes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
