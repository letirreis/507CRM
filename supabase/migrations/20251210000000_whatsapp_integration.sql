-- -----------------------------------------------------------------------------
-- WHATSAPP INTEGRATION TABLES
-- -----------------------------------------------------------------------------

-- 1. WHATSAPP_CONNECTIONS (Manage connected instances/phones)
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_name TEXT NOT NULL,
    instance_id TEXT NOT NULL, -- Evolution API instance name/id
    phone_number TEXT,
    profile_name TEXT,
    profile_pic_url TEXT,
    status TEXT DEFAULT 'DISCONNECTED', -- CONNECTING, CONNECTED, DISCONNECTED
    qr_code TEXT,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wa_connections_org ON public.whatsapp_connections(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS wa_connections_instance_unique ON public.whatsapp_connections(instance_id, organization_id);


-- 2. WHATSAPP_CHATS (Conversations list)
CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL, -- Customer's phone number / remoteJid
    name TEXT,
    profile_pic_url TEXT,
    unread_count INTEGER DEFAULT 0,
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ,
    status TEXT DEFAULT 'OPEN', -- OPEN, CLOSED (for service attendance)
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL, -- Link to CRM contact
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL, -- Link to Active Deal
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wa_chats_connection ON public.whatsapp_chats(connection_id);
CREATE INDEX IF NOT EXISTS idx_wa_chats_org ON public.whatsapp_chats(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS wa_chats_phone_unique ON public.whatsapp_chats(connection_id, phone_number);


-- 3. WHATSAPP_MESSAGES (Message history)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT NOT NULL, -- Message ID from WhatsApp/Evolution API
    chat_id UUID NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'texto', -- texto, image, audio, video, document, etc
    media_url TEXT,
    is_from_me BOOLEAN NOT NULL DEFAULT FALSE,
    sender_name TEXT,
    status TEXT DEFAULT 'SENT', -- SENT, DELIVERED, READ
    timestamp TIMESTAMPTZ NOT NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wa_messages_chat ON public.whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_org ON public.whatsapp_messages(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS wa_messages_msg_id_unique ON public.whatsapp_messages(message_id, chat_id);


-- Policies (Simplified matching the rest of the application)
-- Connections
CREATE POLICY "Admins can manage whatsapp connections"
  ON public.whatsapp_connections
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Members can view whatsapp connections"
  ON public.whatsapp_connections
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Chats
CREATE POLICY "Members can manage whatsapp chats"
  ON public.whatsapp_chats
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Messages
CREATE POLICY "Members can manage whatsapp messages"
  ON public.whatsapp_messages
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Realtime Configuration
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
