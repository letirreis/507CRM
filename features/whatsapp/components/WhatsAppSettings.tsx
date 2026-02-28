'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, QrCode, Smartphone, Trash2 } from 'lucide-react';
import { WhatsAppConnection } from '@/types/whatsapp';

export function WhatsAppSettings() {
    const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const fetchConnections = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/whatsapp/connections');
            const data = await res.json();
            if (data.connections) {
                setConnections(data.connections);
                // Se tem uma conexão gerando QR, já puxa
                const pendingQr = data.connections.find((c: any) => c.status === 'CONNECTING' && c.qr_code);
                if (pendingQr) setQrCode(pendingQr.qr_code);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConnections();

        // Polling pra atualizar o QR Code ou status de conexão
        const interval = setInterval(() => {
            fetchConnections();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateConnection = async () => {
        setLoadingAction('create');
        try {
            const res = await fetch('/api/whatsapp/connections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'CREATE' })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Auto-trigger QR generation
            handleGenerateQr(data.connection.id, data.connection.instance_name);
        } catch (e: any) {
            alert(`Erro: ${e.message}`);
        } finally {
            setLoadingAction(null);
            fetchConnections();
        }
    };

    const handleGenerateQr = async (connectionId: string, instanceName: string) => {
        setLoadingAction('qr');
        try {
            const res = await fetch('/api/whatsapp/connections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'GENERATE_QR', connectionId, instanceName })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setQrCode(data.qrCode);
        } catch (e: any) {
            alert(`Erro ao gerar QR: ${e.message}`);
        } finally {
            setLoadingAction(null);
            fetchConnections();
        }
    };

    const handleLogout = async (connectionId: string, instanceName: string) => {
        setLoadingAction('logout');
        try {
            const res = await fetch('/api/whatsapp/connections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'LOGOUT', connectionId, instanceName })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setQrCode(null);
        } catch (e: any) {
            alert(`Erro: ${e.message}`);
        } finally {
            setLoadingAction(null);
            fetchConnections();
        }
    };

    if (loading && connections.length === 0) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    const primaryConnection = connections[0];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-green-500" />
                        Conexão WhatsApp
                    </CardTitle>
                    <CardDescription>
                        Conecte seu número para enviar mensagens e acompanhar conversas direto do CRM.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!primaryConnection ? (
                        <div className="text-center py-6">
                            <p className="text-muted-foreground mb-4">Você ainda não tem um número conectado.</p>
                            <Button onClick={handleCreateConnection} disabled={loadingAction === 'create'}>
                                {loadingAction === 'create' ? <Loader2 className="mr-2 animate-spin w-4 h-4" /> : <QrCode className="mr-2 w-4 h-4" />}
                                Nova Conexão
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row gap-8 items-start">

                            {/* STATUS INDICATOR */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                                    <div className="flex items-center gap-2">
                                        {primaryConnection.status === 'CONNECTED' && <Badge className="bg-green-500">Conectado</Badge>}
                                        {primaryConnection.status === 'DISCONNECTED' && <Badge variant="destructive">Desconectado</Badge>}
                                        {primaryConnection.status === 'CONNECTING' && <Badge variant="secondary" className="animate-pulse">Aguardando QR Code...</Badge>}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Instância</h3>
                                    <p className="text-sm font-mono bg-muted p-2 rounded">{primaryConnection.instance_name}</p>
                                </div>

                                {primaryConnection.phone_number && (
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Número</h3>
                                        <p className="text-sm">{primaryConnection.phone_number}</p>
                                    </div>
                                )}
                            </div>

                            {/* QR CODE AREA */}
                            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg border border-dashed">
                                {primaryConnection.status === 'CONNECTED' ? (
                                    <div className="text-center">
                                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Smartphone className="w-12 h-12 text-green-600" />
                                        </div>
                                        <p className="font-medium">Aparelho Conectado</p>
                                        <p className="text-sm text-muted-foreground mt-1">Sincronização em tempo real ativa.</p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        {qrCode ? (
                                            <div className="space-y-4">
                                                <div className="bg-white p-2 rounded-lg inline-block">
                                                    {/* Evolution return base64 containing data:image/png;base64,... */}
                                                    <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code" className="w-48 h-48" />
                                                </div>
                                                <p className="text-sm text-muted-foreground">Abra o WhatsApp, vá em "Aparelhos Conectados" e escaneie este código.</p>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                onClick={() => handleGenerateQr(primaryConnection.id, primaryConnection.instance_name)}
                                                disabled={loadingAction === 'qr'}
                                            >
                                                {loadingAction === 'qr' ? <Loader2 className="mr-2 animate-spin w-4 h-4" /> : <QrCode className="mr-2 w-4 h-4" />}
                                                Gerar QR Code
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </CardContent>
                {primaryConnection && (
                    <CardFooter className="bg-muted/30 border-t flex justify-between">
                        <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleLogout(primaryConnection.id, primaryConnection.instance_name)}
                            disabled={loadingAction === 'logout'}>
                            {loadingAction === 'logout' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Desconectar Aparelho
                        </Button>

                        {primaryConnection.status === 'CONNECTED' && (
                            <Button variant="outline" onClick={() => window.location.href = '/whatsapp/chat'}>
                                Ir para Conversas
                            </Button>
                        )}
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
