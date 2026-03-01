/**
 * Evolution API Client
 * 
 * Este módulo contém as funções para interagir com a instalação da Evolution API
 * que está rodando na VPS da Hetzner.
 */

// Como estamos construindo para um cenário onde a API da Evolution estará externa,
// e que o usuário ainda não colocou a URL e Token no .env, vamos usar variáveis 
// de ambiente para essas rotas.
const getEvoConfig = () => {
    const url = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    // Remove trailing slashes
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    return {
        url: cleanUrl,
        key: process.env.EVOLUTION_GLOBAL_API_KEY || 'SUA_API_KEY_GLOBAL_AQUI'
    };
};

/**
 * Cria uma nova instância na Evolution API
 * @param instanceName O nome da instância (ex: 'wa-crm-123')
 */
export async function createInstance(instanceName: string) {
    const config = getEvoConfig();
    console.log(`[Evolution] Calling createInstance at ${config.url}/instance/create`);

    try {
        const response = await fetch(`${config.url}/instance/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.key,
            },
            body: JSON.stringify({
                instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            console.error('[Evolution] Error creating instance:', error);
            throw new Error(error.message || `API Error: ${response.status}`);
        }

        return await response.json();
    } catch (e: any) {
        console.error('[Evolution] Network fetch failed:', e);
        throw new Error(`Evolution API Inacessível: ${e.message}`);
    }
}

/**
 * Busca o status e o QR Code de uma instância
 * @param instanceName O nome da instância
 */
export async function fetchInstanceConnectionState(instanceName: string) {
    const config = getEvoConfig();
    const response = await fetch(`${config.url}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: {
            'apikey': config.key,
        },
    });

    if (!response.ok) {
        throw new Error('Erro ao buscar status de conexão da instância');
    }

    return response.json(); // { instance: { state: "open" } }
}

/**
 * Busca o QR Code em base64 e pareamento de uma instância
 * Caso a instância já esteja 'open' (conectada), isso vai dar erro, logo deve ser tratado no frontend
 */
export async function connectInstance(instanceName: string) {
    const config = getEvoConfig();
    const response = await fetch(`${config.url}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
            'apikey': config.key,
        },
    });

    if (!response.ok) {
        throw new Error('Erro ao solicitar conexão/QR Code');
    }

    return response.json(); // { base64: "...", pairingCode: "..." }
}


/**
 * Desconecta/Exclui uma instância
 * @param instanceName O nome da instância a ser desconectada
 */
export async function logoutInstance(instanceName: string) {
    const config = getEvoConfig();
    const response = await fetch(`${config.url}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
            'apikey': config.key,
        },
    });

    if (!response.ok) {
        throw new Error('Erro ao desconectar instância');
    }

    return response.json();
}

/**
 * Configura as URLs de Webhook para uma instância recém-criada
 * Isso diz para a Evolution API enviar as mensagens para a Vercel
 * @param instanceName O nome da instância
 * @param crmWebhookUrl A URL /api/whatsapp/webhook do CRM
 */
export async function setInstanceWebhooks(instanceName: string, crmWebhookUrl: string) {
    const config = getEvoConfig();

    // Check if the webhook URL is localhost. Evolution API won't fire local webhooks easily unless tunneled
    if (crmWebhookUrl.includes('localhost')) {
        console.warn(`[Evolution] Localhost webhook detected (${crmWebhookUrl}). The Evolution API might not be able to reach it.`);
    }

    const response = await fetch(`${config.url}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': config.key,
        },
        body: JSON.stringify({
            webhook: {
                enabled: true,
                url: crmWebhookUrl,
                byEvents: false,
                base64: false,
                readMessage: true,
                events: [
                    'APPLICATION_STARTUP',
                    'QRCODE_UPDATED',
                    'MESSAGES_UPSERT',
                    'MESSAGES_UPDATE',
                    'MESSAGES_DELETE',
                    'SEND_MESSAGE',
                    'CONTACTS_UPSERT',
                    'CONTACTS_UPDATE',
                    'PRESENCE_UPDATE',
                    'CHATS_UPSERT',
                    'CHATS_UPDATE',
                    'CHATS_DELETE',
                    'GROUPS_UPSERT',
                    'GROUP_UPDATE',
                    'GROUP_PARTICIPANTS_UPDATE',
                    'CONNECTION_UPDATE',
                    'CALL'
                ],
            }
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        console.error('[Evolution Webhook Set Error]:', errorData);
        throw new Error(`[Evolution API]: ${errorData.message || JSON.stringify(errorData)}`);
    }

    return response.json();
}

/**
 * Envia uma mensagem de texto simples pelo WhatsApp
 * @param instanceName A instância remetente
 * @param number O telefone destinatário (com DDI, ex: 5511999999999)
 * @param text O conteúdo da mensagem
 */
export async function sendWhatsAppMessage(instanceName: string, number: string, text: string) {
    const config = getEvoConfig();
    const response = await fetch(`${config.url}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': config.key,
        },
        body: JSON.stringify({
            number,
            text,
            delay: 1200, // delay pra simular digitação
        }),
    });

    if (!response.ok) {
        throw new Error('Erro ao enviar mensagem de WhatsApp');
    }

    return response.json();
}
