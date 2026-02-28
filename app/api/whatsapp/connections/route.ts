import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createInstance, fetchInstanceConnectionState, connectInstance, logoutInstance, setInstanceWebhooks } from "@/lib/evolution-api";

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: me } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!me?.organization_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        const organizationId = me.organization_id;

        const { data: connections, error } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('organization_id', organizationId);

        if (error) throw error;

        // Refresh status by checking Evolution API
        // Non-blocking: if Evolution is down, we still return the DB connections
        const updatedConnections = await Promise.all(connections.map(async (connection) => {
            try {
                const state = await fetchInstanceConnectionState(connection.instance_name);
                const statusMap: Record<string, string> = {
                    'open': 'CONNECTED',
                    'connecting': 'CONNECTING',
                    'close': 'DISCONNECTED'
                };
                const currentEvoStatus = statusMap[state?.instance?.state] || 'DISCONNECTED';

                if (currentEvoStatus !== connection.status) {
                    await supabase.from('whatsapp_connections')
                        .update({ status: currentEvoStatus })
                        .eq('id', connection.id);
                    connection.status = currentEvoStatus;
                }
            } catch (e) {
                console.log(`[Evolution Sync] Failed to fetch state for ${connection.instance_name}`);
                // Only update to DISCONNECTED if we really know it's disconnected,
                // or leave as is if we just can't reach the API. Here we assume it's offline.
                if (connection.status !== 'DISCONNECTED') {
                    await supabase.from('whatsapp_connections')
                        .update({ status: 'DISCONNECTED' })
                        .eq('id', connection.id);
                    connection.status = 'DISCONNECTED';
                }
            }
            return connection;
        }));

        return NextResponse.json({ connections: updatedConnections });
    } catch (error: any) {
        console.error('[Connections GET Error]', error);
        return NextResponse.json({ error: error.message || 'Error fetching connections' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, instanceName, connectionId } = body;
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: me } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!me?.organization_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        const organizationId = me.organization_id;

        // 1. Create a new connection
        if (action === 'CREATE') {
            try {
                const dbInstanceName = instanceName || `crm-${organizationId.substring(0, 8)}-${Date.now()}`;

                // Call Evolution API
                const evoRes = await createInstance(dbInstanceName);

                // Set webhooks right after creation
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                await setInstanceWebhooks(dbInstanceName, `${appUrl}/api/whatsapp/webhook`).catch(e => {
                    console.error('[Evolution] Failed to set webhook, but instance created.', e);
                });

                // Save to Supabase
                const { data, error } = await supabase
                    .from('whatsapp_connections')
                    .insert({
                        organization_id: organizationId,
                        instance_name: dbInstanceName,
                        instance_id: evoRes?.instance?.instanceName || dbInstanceName,
                        status: 'DISCONNECTED',
                    })
                    .select('*')
                    .single();

                if (error) throw error;
                return NextResponse.json({ connection: data });
            } catch (e: any) {
                console.error('[Connections CREATE Error]', e);
                // Return a specific 502 Bad Gateway if the external Evolution API is down
                return NextResponse.json({ error: e.message || 'Failed to create instance on Evolution API' }, { status: 502 });
            }
        }

        // 2. Generate QR Code
        if (action === 'GENERATE_QR') {
            try {
                const qrData = await connectInstance(instanceName);
                if (qrData.base64) {
                    await supabase.from('whatsapp_connections')
                        .update({ qr_code: qrData.base64, status: 'CONNECTING' })
                        .eq('id', connectionId);
                    return NextResponse.json({ qrCode: qrData.base64 });
                }
                return NextResponse.json({ error: 'Nenhum QR Code retornado pela API.' }, { status: 400 });
            } catch (e: any) {
                console.error('[Connections GENERATE_QR Error]', e);
                return NextResponse.json({ error: e.message || 'Evolution API inacessível para gerar QR Code' }, { status: 502 });
            }
        }

        // 3. Logout / Drop
        if (action === 'LOGOUT') {
            try {
                await logoutInstance(instanceName);
            } catch (e) {
                console.log('[LOGOUT] API error', e);
            }

            await supabase.from('whatsapp_connections')
                .update({ status: 'DISCONNECTED', qr_code: null })
                .eq('id', connectionId);

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('[Connections POST Global Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
