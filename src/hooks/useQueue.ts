import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Token, DoctorSettings, QueueState, TokenStatus } from '@/types/queue';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export function useTokens() {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['tokens', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('queue_date', today)
        .order('token_number', { ascending: true });
      
      if (error) throw error;
      return data as Token[];
    },
  });
}

export function useDoctorSettings() {
  return useQuery({
    queryKey: ['doctor-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctor_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as DoctorSettings | null;
    },
  });
}

export function useQueueState() {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['queue-state', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('queue_state')
        .select('*')
        .eq('queue_date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data as QueueState | null;
    },
  });
}

export function useUpdateTokenStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TokenStatus }) => {
      const { data, error } = await supabase
        .from('tokens')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      queryClient.invalidateQueries({ queryKey: ['queue-state'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCallNextPatient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];
  
  return useMutation({
    mutationFn: async () => {
      // Get current running token and mark as completed
      const { data: runningTokens } = await supabase
        .from('tokens')
        .select('*')
        .eq('queue_date', today)
        .eq('status', 'RUNNING');
      
      if (runningTokens && runningTokens.length > 0) {
        await supabase
          .from('tokens')
          .update({ status: 'COMPLETED' })
          .eq('id', runningTokens[0].id);
      }
      
      // Get next waiting token
      const { data: waitingTokens, error: fetchError } = await supabase
        .from('tokens')
        .select('*')
        .eq('queue_date', today)
        .eq('status', 'WAITING')
        .order('token_number', { ascending: true })
        .limit(1);
      
      if (fetchError) throw fetchError;
      
      if (!waitingTokens || waitingTokens.length === 0) {
        throw new Error('No waiting patients in queue');
      }
      
      // Mark as running
      const { data, error } = await supabase
        .from('tokens')
        .update({ status: 'RUNNING' })
        .eq('id', waitingTokens[0].id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update queue state
      await supabase
        .from('queue_state')
        .update({ current_token_number: waitingTokens[0].token_number })
        .eq('queue_date', today);
      
      // Trigger WhatsApp alerts for next patients in queue
      try {
        await supabase.functions.invoke('send-alert', {
          body: { currentTokenNumber: waitingTokens[0].token_number },
        });
      } catch (alertError) {
        console.error('Failed to send WhatsApp alerts:', alertError);
        // Don't fail the main operation if alerts fail
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      queryClient.invalidateQueries({ queryKey: ['queue-state'] });
      toast({
        title: 'Next Patient Called',
        description: `Token #${data.token_number} - ${data.patient_name} is now being served`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAddToken() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];
  
  return useMutation({
    mutationFn: async ({ patient_name, phone_number }: { patient_name: string; phone_number: string }) => {
      // Get current queue state
      const { data: queueState, error: queueError } = await supabase
        .from('queue_state')
        .select('*')
        .eq('queue_date', today)
        .maybeSingle();
      
      if (queueError) throw queueError;
      
      const nextTokenNumber = (queueState?.total_tokens_today || 0) + 1;
      
      // Get doctor settings for wait time calculation
      const { data: settings } = await supabase
        .from('doctor_settings')
        .select('avg_consultation_time')
        .limit(1)
        .single();
      
      // Count waiting tokens
      const { count } = await supabase
        .from('tokens')
        .select('*', { count: 'exact', head: true })
        .eq('queue_date', today)
        .eq('status', 'WAITING');
      
      const waitingCount = count || 0;
      const avgTime = settings?.avg_consultation_time || 7;
      const estimatedWait = waitingCount * avgTime;
      
      // Insert new token
      const { data, error } = await supabase
        .from('tokens')
        .insert({
          token_number: nextTokenNumber,
          patient_name,
          phone_number,
          status: 'WAITING',
          estimated_wait_time: estimatedWait,
          queue_date: today,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update queue state
      if (queueState) {
        await supabase
          .from('queue_state')
          .update({ total_tokens_today: nextTokenNumber })
          .eq('id', queueState.id);
      } else {
        await supabase
          .from('queue_state')
          .insert({
            queue_date: today,
            current_token_number: 0,
            total_tokens_today: nextTokenNumber,
          });
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      queryClient.invalidateQueries({ queryKey: ['queue-state'] });
      toast({
        title: 'Token Generated',
        description: `Token #${data.token_number} created for ${data.patient_name}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRealtimeTokens() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  
  useEffect(() => {
    const channel = supabase
      .channel('tokens-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tokens',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tokens', today] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_state',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['queue-state', today] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, today]);
}
