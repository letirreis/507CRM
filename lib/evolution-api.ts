/**
 * Evolution API Client
 * 
 * Este módulo contém as funções para interagir com a instalação da Evolution API
 * que está rodando na VPS da Hetzner.
 */

// Como estamos construindo para um cenário onde a API da Evolution estará externa,
// e que o usuário ainda não colocou a URL e Token no .env, vamos usar variáveis 
// de ambiente para essas rotas.
const EVO_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVO_GLOBAL_API_KEY = process.env.EVOLUTION_GLOBAL_API_KEY || 'SUA_API_KEY_GLOBAL_AQUI';

/**
 * Cria uma nova instância na Evolution API
 * @param instanceName O nome da instância (ex: 'wa-crm-123')
 */
export async function createInstance(instanceName: string) {
    const response = await fetch(`${EVO_API_URL}/instance/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': EVO_GLOBAL_API_KEY,
        },
        body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar instância no WhatsApp API');
    }

    return response.json();
}

/**
 * Busca o status e o QR Code de uma instância
 * @param instanceName O nome da instância
 */
export async function fetchInstanceConnectionState(instanceName: string) {
    const response = await fetch(`${EVO_API_URL}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: {
            'apikey': EVO_GLOBAL_API_KEY,
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
    const response = await fetch(`${EVO_API_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
            'apikey': EVO_GLOBAL_API_KEY,
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
    const response = await fetch(`${EVO_API_URL}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
            'apikey': EVO_GLOBAL_API_KEY,
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
    const response = await fetch(`${EVO_API_URL}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': EVO_GLOBAL_API_KEY,
        },
        body: JSON.stringify({
            url: crmWebhookUrl,
            webhookByEvents: false,
            webhookBase64: false, // se quiser baixar medias por webhook, mude para true (cuidado com payload size)
            events: [
                'MESSAGES_UPSERT',       // novas mensagens recebidas
                'SEND_MESSAGE',          // quando você envia uma mensagem (para salvar no BD)
                'CONNECTION_UPDATE',     // quando o QR code é lido ou cai a conexão
                'CALL'                   // se quiser tratar ligações do whatsapp
            ],
        }),
    });

    if (!response.ok) {
        throw new Error('Erro ao configurar webhooks na instância');
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
    const response = await fetch(`${EVO_API_URL}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': EVO_GLOBAL_API_KEY,
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
