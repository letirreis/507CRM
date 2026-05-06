-- Add custom fields support for contacts
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
