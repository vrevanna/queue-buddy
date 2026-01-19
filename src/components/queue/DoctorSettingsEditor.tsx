import { useState } from 'react';
import { useDoctorSettings, useUpdateDoctorSettings } from '@/hooks/useQueue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, Settings, Save, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function DoctorSettingsEditor() {
  const { data: settings, isLoading } = useDoctorSettings();
  const updateSettings = useUpdateDoctorSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    clinic_name: '',
    start_time: '',
    end_time: '',
    avg_consultation_time: 7,
    is_active: true,
  });

  const handleEdit = () => {
    if (settings) {
      setFormData({
        clinic_name: settings.clinic_name,
        start_time: settings.start_time_morning.slice(0, 5),
        end_time: settings.end_time_morning.slice(0, 5),
        avg_consultation_time: settings.avg_consultation_time,
        is_active: settings.is_active,
      });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    updateSettings.mutate({
      clinic_name: formData.clinic_name,
      start_time_morning: formData.start_time + ':00',
      end_time_morning: formData.end_time + ':00',
      start_time_evening: formData.end_time + ':00',
      end_time_evening: formData.end_time + ':00',
      avg_consultation_time: formData.avg_consultation_time,
      is_active: formData.is_active,
    }, {
      onSuccess: () => setIsEditing(false),
    });
  };

  function formatTime(time: string) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

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

  if (isEditing) {
    return (
      <Card className="card-elevated border-primary/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Edit Clinic Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clinic_name">Clinic Name</Label>
            <Input
              id="clinic_name"
              value={formData.clinic_name}
              onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_time">Opening Time</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Closing Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avg_time">Avg. Consultation Time (mins)</Label>
            <Input
              id="avg_time"
              type="number"
              min={1}
              max={60}
              value={formData.avg_consultation_time}
              onChange={(e) => setFormData({ ...formData, avg_consultation_time: parseInt(e.target.value) || 7 })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Clinic Open</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={updateSettings.isPending} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {updateSettings.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={updateSettings.isPending}>
              <X className="w-4 h-4" />
            </Button>
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
            <Settings className="w-5 h-5 text-primary" />
            {settings.clinic_name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={settings.is_active ? 'default' : 'secondary'}>
              {settings.is_active ? 'Open' : 'Closed'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1 flex-1">
            <p className="text-sm font-medium">Visiting Hours</p>
            <p className="text-sm text-muted-foreground">
              {formatTime(settings.start_time_morning)} – {formatTime(settings.end_time_morning)}
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Avg. Consultation: {settings.avg_consultation_time} mins
        </div>
        <Button variant="outline" onClick={handleEdit} className="w-full">
          <Settings className="w-4 h-4 mr-2" />
          Edit Settings
        </Button>
      </CardContent>
    </Card>
  );
}
