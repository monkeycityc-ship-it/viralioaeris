
-- Add voice character tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS characters_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS characters_limit integer NOT NULL DEFAULT 3000;

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  tool text,
  details jsonb DEFAULT '{}'::jsonb,
  credits_used integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs"
  ON public.activity_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete logs"
  ON public.activity_logs FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update any profile (for credit/plan/ban management)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for faster queries
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
