import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/evolution-api";

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Auth check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: me, error: meError } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

        if (meError || !me?.organization_id) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const organizationId = me.organization_id;

        const body = await req.json();
        const { chatId, text } = body;

        // 1. Validate chat belongs to user org
        const { data: chat, error: chatError } = await supabase
            .from('whatsapp_chats')
            .select('*, whatsapp_connections(instance_name)')
            .eq('id', chatId)
            .eq('organization_id', organizationId)
            .single();

        if (chatError || !chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        const instanceName = chat.whatsapp_connections.instance_name;

        // 2. Call Evolution API to send
        const evolutionResponse = await sendWhatsAppMessage(instanceName, chat.phone_number, text);

        // 3. Insert message locally to show immediately (Optimistic update on DB side instead of waiting for webhook)
        const { data: newMessage, error: insertError } = await supabase
            .from('whatsapp_messages')
            .insert({
                message_id: evolutionResponse.key?.id || `local-${Date.now()}`,
                chat_id: chat.id,
                organization_id: organizationId,
                content: text,
                type: 'texto',
                is_from_me: true,
                sender_name: user.email,
                timestamp: new Date().toISOString(),
                status: 'SENT'
            })
            .select('*')
            .single();

        if (insertError) {
            console.warn('Failed to insert local message replica', insertError);
        }

        return NextResponse.json({
            success: true,
            message: newMessage,
            evolutionResponse
        });

    } catch (error: any) {
        console.error('[Send Message API]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
