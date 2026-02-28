import { OrganizationId, ClientCompanyId } from './types';

export type WhatsAppConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

export interface WhatsAppConnection {
    id: string;
    organizationId: OrganizationId;
    instanceName: string;
    instanceId: string;
    phoneNumber?: string;
    profileName?: string;
    profilePicUrl?: string;
    status: WhatsAppConnectionStatus;
    qrCode?: string;
    createdAt: string;
    updatedAt: string;
}

export type WhatsAppChatStatus = 'OPEN' | 'CLOSED';

export interface WhatsAppChat {
    id: string;
    organizationId: OrganizationId;
    connectionId: string;
    phoneNumber: string; // remoteJid
    name?: string;
    profilePicUrl?: string;
    unreadCount: number;
    lastMessageText?: string;
    lastMessageAt?: string;
    status: WhatsAppChatStatus;
    assignedTo?: string; // Profile ID
    contactId?: string; // Link to CRM contact
    dealId?: string; // Link to CRM deal
    createdAt: string;
    updatedAt: string;
}

export type WhatsAppMessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'ERROR';
export type WhatsAppMessageType = 'texto' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'interactive' | 'location';

export interface WhatsAppMessage {
    id: string;
    organizationId: OrganizationId;
    messageId: string;
    chatId: string;
    content: string;
    type: WhatsAppMessageType;
    mediaUrl?: string;
    isFromMe: boolean;
    senderName?: string;
    status: WhatsAppMessageStatus;
    timestamp: string;
    createdAt: string;
}
