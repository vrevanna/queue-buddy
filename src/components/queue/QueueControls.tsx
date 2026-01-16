import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCallNextPatient, useAddToken, useTokens } from '@/hooks/useQueue';
import { Play, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function QueueControls() {
  const callNext = useCallNextPatient();
  const addToken = useAddToken();
  const { data: tokens } = useTokens();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const hasWaiting = tokens?.some(t => t.status === 'WAITING');
  const hasRunning = tokens?.some(t => t.status === 'RUNNING');
  
  const handleAddToken = async (e: React.FormEvent) => {
    e.preventDefault();
    await addToken.mutateAsync({ patient_name: name, phone_number: phone });
    setName('');
    setPhone('');
    setIsOpen(false);
  };
  
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        size="lg"
        onClick={() => callNext.mutate()}
        disabled={!hasWaiting || callNext.isPending}
        className="gap-2"
      >
        <Play className="w-5 h-5" />
        {hasRunning ? 'Next Patient' : 'Start Queue'}
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="lg" variant="outline" className="gap-2">
            <Plus className="w-5 h-5" />
            Add Token Manually
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleAddToken}>
            <DialogHeader>
              <DialogTitle>Add New Token</DialogTitle>
              <DialogDescription>
                Manually create a token for walk-in patients
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Patient Name</Label>
                <Input
                  id="name"
                  placeholder="Enter patient name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addToken.isPending}>
                Generate Token
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
