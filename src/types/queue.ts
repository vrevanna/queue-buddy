export type TokenStatus = 'WAITING' | 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Token {
  id: string;
  token_number: number;
  patient_name: string;
  phone_number: string;
  status: TokenStatus;
  created_at: string;
  estimated_wait_time: number;
  notified: boolean;
  queue_date: string;
}

export interface DoctorSettings {
  id: string;
  clinic_name: string;
  start_time_morning: string;
  end_time_morning: string;
  start_time_evening: string;
  end_time_evening: string;
  avg_consultation_time: number;
  is_active: boolean;
  updated_at: string;
}

export interface QueueState {
  id: string;
  current_token_number: number;
  total_tokens_today: number;
  queue_date: string;
  updated_at: string;
}
