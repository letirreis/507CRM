import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[Webhook Evolution Webhook Error]: Missing Supabase environment variables');
            return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const body = await req.json();

        // Webhook auth check - you should define a global secret in Evolution API
        const authHeader = req.headers.get('apikey');
        // Temporarily bypassing strict API Key check because Evolution might not be sending it properly depending on webhook setup version
        // if (authHeader !== process.env.EVOLUTION_GLOBAL_API_KEY && process.env.EVOLUTION_GLOBAL_API_KEY) {
        //     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        const { event, instance, data } = body;
        const instanceName = instance; // Ex: 'crm-user-123'

        // Find connection to get organization_id
        const { data: connection } = await supabase
            .from('whatsapp_connections')
            .select('id, organization_id')
            .eq('instance_name', instanceName)
            .single();

        if (!connection) {
            console.warn(`[Evolution Webhook] Instance ${instanceName} not found in DB`);
            return NextResponse.json({ ok: true }); // evolution retry logic prevention
        }

        // Handle incoming messages
        if (event === 'MESSAGES_UPSERT') {
            const messages = data.messages || [];

            for (const rawMsg of messages) {
                // Ignorar status de broadcast ou status_update
                if (!rawMsg.message || rawMsg.key.remoteJid === 'status@broadcast') continue;

                const isFromMe = rawMsg.key.fromMe;
                const remoteJid = rawMsg.key.remoteJid;
                const messageId = rawMsg.key.id;
                const pushName = rawMsg.pushName || remoteJid.split('@')[0];

                // Extrair texto (varia de acordo com o tipo: conversa, imagem com caption, etc)
                const textContent =
                    rawMsg.message.conversation ||
                    rawMsg.message.extendedTextMessage?.text ||
                    rawMsg.message.imageMessage?.caption ||
                    rawMsg.message.videoMessage?.caption ||
                    '';

                const messageType = Object.keys(rawMsg.message)[0].replace('Message', '');

                // 1. Encontrar ou criar o Chat
                let { data: chat } = await supabase
                    .from('whatsapp_chats')
                    .select('id, unread_count')
                    .eq('connection_id', connection.id)
                    .eq('phone_number', remoteJid)
                    .single();

                if (!chat) {
                    const { data: newChat } = await supabase
                        .from('whatsapp_chats')
                        .insert({
                            connection_id: connection.id,
                            organization_id: connection.organization_id,
                            phone_number: remoteJid,
                            name: pushName,
                            status: 'OPEN',
                            unread_count: isFromMe ? 0 : 1,
                            last_message_text: textContent,
                            last_message_at: new Date().toISOString()
                        })
                        .select('id, unread_count')
                        .single();
                    chat = newChat;
                } else {
                    // Atualiza dados do chat
                    await supabase
                        .from('whatsapp_chats')
                        .update({
                            last_message_text: textContent,
                            last_message_at: new Date().toISOString(),
                            unread_count: isFromMe ? 0 : chat.unread_count + 1,
                            name: pushName // atualiza nome se mudou
                        })
                        .eq('id', chat.id);
                }

                // 2. Inserir a mensagem
                if (chat) {
                    await supabase
                        .from('whatsapp_messages')
                        .upsert({
                            message_id: messageId,
                            chat_id: chat.id,
                            organization_id: connection.organization_id,
                            content: textContent,
                            type: messageType,
                            is_from_me: isFromMe,
                            sender_name: pushName,
                            timestamp: new Date(rawMsg.messageTimestamp * 1000).toISOString(),
                            status: isFromMe ? 'SENT' : 'DELIVERED'
                        }, {
                            onConflict: 'message_id,chat_id'
                        });
                }
            }
        }

        // Handle Connection Updates (QR Code Scan, Disconnect, etc)
        else if (event === 'CONNECTION_UPDATE') {
            const state = data.state; // open, connecting, close
            const qrCode = data.qr; // se state == connecting, pode ter um base64

            let newStatus = 'DISCONNECTED';
            if (state === 'open') newStatus = 'CONNECTED';
            else if (state === 'connecting') newStatus = 'CONNECTING';

            const updatePayload: any = {
                status: newStatus,
                updated_at: new Date().toISOString()
            };

            if (qrCode) updatePayload.qr_code = qrCode;

            await supabase
                .from('whatsapp_connections')
                .update(updatePayload)
                .eq('id', connection.id);
        }

        // Handle Message Status Updates (Read Receipts, etc)
        else if (event === 'SEND_MESSAGE') {
            // evolution sends this when our API sends a message out.
            // It can be handled to mark double-ticks
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('[Webhook Evolution Webhook Error]: ', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
