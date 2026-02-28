import { Metadata } from 'next';
import { ChatLayout } from '@/features/whatsapp/components/ChatLayout';

export const metadata: Metadata = {
    title: 'WhatsApp Chat | NossoCRM',
    description: 'Chat with your leads and customers.',
};

export default function WhatsAppChatPage() {
    return (
        <div className="flex-1 h-full p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2 mb-4">
                <h2 className="text-3xl font-bold tracking-tight">Atendimento WhatsApp</h2>
            </div>
            <ChatLayout />
        </div>
    );
}
