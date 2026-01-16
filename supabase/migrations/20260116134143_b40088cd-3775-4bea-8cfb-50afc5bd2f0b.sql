-- Create token status enum
CREATE TYPE public.token_status AS ENUM ('WAITING', 'RUNNING', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- Create tokens table
CREATE TABLE public.tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    token_number INTEGER NOT NULL,
    patient_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    status public.token_status NOT NULL DEFAULT 'WAITING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    estimated_wait_time INTEGER NOT NULL DEFAULT 0,
    notified BOOLEAN NOT NULL DEFAULT false,
    queue_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Create doctor_settings table
CREATE TABLE public.doctor_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    start_time_morning TIME NOT NULL DEFAULT '10:00:00',
    end_time_morning TIME NOT NULL DEFAULT '13:00:00',
    start_time_evening TIME NOT NULL DEFAULT '17:00:00',
    end_time_evening TIME NOT NULL DEFAULT '20:00:00',
    avg_consultation_time INTEGER NOT NULL DEFAULT 7,
    is_active BOOLEAN NOT NULL DEFAULT true,
    clinic_name TEXT NOT NULL DEFAULT 'ABC Clinic',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create queue_state table
CREATE TABLE public.queue_state (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    current_token_number INTEGER NOT NULL DEFAULT 0,
    total_tokens_today INTEGER NOT NULL DEFAULT 0,
    queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(queue_date)
);

-- Enable RLS on all tables
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_state ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is authenticated (receptionist)
CREATE OR REPLACE FUNCTION public.is_receptionist()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- RLS Policies for tokens
CREATE POLICY "Receptionists can view all tokens"
ON public.tokens
FOR SELECT
USING (public.is_receptionist());

CREATE POLICY "Receptionists can insert tokens"
ON public.tokens
FOR INSERT
WITH CHECK (public.is_receptionist());

CREATE POLICY "Receptionists can update tokens"
ON public.tokens
FOR UPDATE
USING (public.is_receptionist());

CREATE POLICY "Receptionists can delete tokens"
ON public.tokens
FOR DELETE
USING (public.is_receptionist());

-- RLS Policies for doctor_settings
CREATE POLICY "Receptionists can view doctor settings"
ON public.doctor_settings
FOR SELECT
USING (public.is_receptionist());

CREATE POLICY "Receptionists can update doctor settings"
ON public.doctor_settings
FOR UPDATE
USING (public.is_receptionist());

-- RLS Policies for queue_state
CREATE POLICY "Receptionists can view queue state"
ON public.queue_state
FOR SELECT
USING (public.is_receptionist());

CREATE POLICY "Receptionists can update queue state"
ON public.queue_state
FOR UPDATE
USING (public.is_receptionist());

CREATE POLICY "Receptionists can insert queue state"
ON public.queue_state
FOR INSERT
WITH CHECK (public.is_receptionist());

-- Insert default doctor settings
INSERT INTO public.doctor_settings (clinic_name, start_time_morning, end_time_morning, start_time_evening, end_time_evening, avg_consultation_time)
VALUES ('ABC Clinic', '10:00:00', '13:00:00', '17:00:00', '20:00:00', 7);

-- Insert initial queue state for today
INSERT INTO public.queue_state (current_token_number, total_tokens_today, queue_date)
VALUES (0, 0, CURRENT_DATE);

-- Enable realtime for tokens table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_state;