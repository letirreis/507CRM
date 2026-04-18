import { Metadata } from 'next';
import { WhatsAppSettings } from '@/features/whatsapp/components/WhatsAppSettings';

export const metadata: Metadata = {
    title: 'WhatsApp Settings | Gravidade 507',
    description: 'Manage your WhatsApp connections.',
};

export default function WhatsAppSettingsPage() {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">WhatsApp (Beta)</h2>
            </div>
            <WhatsAppSettings />
        </div>
    );
}
