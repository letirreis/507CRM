import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createInstance, fetchInstanceConnectionState, connectInstance, logoutInstance, setInstanceWebhooks } from "@/lib/evolution-api";
import { getSingleTenantId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const organizationId = await getSingleTenantId();

        const { data: connections, error } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('organization_id', organizationId);

        if (error) throw error;

        // Refresh status by checking Evolution API
        for (const connection of connections) {
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
                console.log(`Failed to fetch state for ${connection.instance_name}`);
                if (connection.status !== 'DISCONNECTED') {
                    await supabase.from('whatsapp_connections')
                        .update({ status: 'DISCONNECTED' })
                        .eq('id', connection.id);
                    connection.status = 'DISCONNECTED';
                }
            }
        }

        return NextResponse.json({ connections });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, instanceName, connectionId } = body;
        const organizationId = await getSingleTenantId();
        const supabase = await createClient();

        // 1. Create a new connection
        if (action === 'CREATE') {
            const dbInstanceName = instanceName || `crm-${organizationId.substring(0, 8)}-${Date.now()}`;

            // Call Evolution API
            const evoRes = await createInstance(dbInstanceName);

            // Set webhooks right after creation
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            await setInstanceWebhooks(dbInstanceName, `${appUrl}/api/whatsapp/webhook`);

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
            } catch (e: any) {
                return NextResponse.json({ error: e.message }, { status: 400 });
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
