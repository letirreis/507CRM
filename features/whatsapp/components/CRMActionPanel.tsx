'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, UserPlus, Briefcase, Bot, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';

export function CRMActionPanel({ chat }: { chat: any }) {
    const [isLoadingContact, setIsLoadingContact] = useState(false);
    const [isLoadingDeal, setIsLoadingDeal] = useState(false);
    const supabase = createClient();

    if (!chat) return null;

    const handleSaveContact = async () => {
        if (!supabase) return;
        setIsLoadingContact(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error('Not authenticated');

            // 1. Criar o contato no CRM
            const { data: newContact, error: contactError } = await supabase
                .from('contacts')
                .insert({
                    name: chat.name || chat.phone_number,
                    phone: chat.phone_number,
                    organization_id: chat.organization_id,
                    owner_id: userData.user.id,
                    source: 'WhatsApp'
                })
                .select()
                .single();

            if (contactError) throw contactError;

            // 2. Vincular o contato ao Chat
            await supabase
                .from('whatsapp_chats')
                .update({ contact_id: newContact.id })
                .eq('id', chat.id);

        } catch (error) {
            console.error('Error saving contact:', error);
            alert('Erro ao salvar contato.');
        } finally {
            setIsLoadingContact(false);
        }
    };

    const handleCreateDeal = async () => {
        if (!supabase) return;
        setIsLoadingDeal(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error('Not authenticated');

            let finalContactId = chat.contact_id;

            // Se não tem contato ainda, cria na hora
            if (!finalContactId) {
                const { data: newContact } = await supabase
                    .from('contacts')
                    .insert({
                        name: chat.name || chat.phone_number,
                        phone: chat.phone_number,
                        organization_id: chat.organization_id,
                        owner_id: userData.user.id,
                        source: 'WhatsApp'
                    }).select().single();

                if (newContact) {
                    finalContactId = newContact.id;
                    await supabase.from('whatsapp_chats').update({ contact_id: newContact.id }).eq('id', chat.id);
                }
            }

            // Criar o Deal
            const { data: newDeal, error: dealError } = await supabase
                .from('deals')
                .insert({
                    title: `Negociação: ${chat.name || chat.phone_number}`,
                    contact_id: finalContactId,
                    organization_id: chat.organization_id,
                    owner_id: userData.user.id,
                    priority: 'medium',
                    status: 'active'
                })
                .select()
                .single();

            if (dealError) throw dealError;

            // Vincular o Deal ao Chat
            await supabase
                .from('whatsapp_chats')
                .update({ deal_id: newDeal.id })
                .eq('id', chat.id);

        } catch (error) {
            console.error('Error creating deal:', error);
            alert('Erro ao criar negociação.');
        } finally {
            setIsLoadingDeal(false);
        }
    };

    const handleAddTag = async () => {
        if (!supabase) return;
        const newTag = window.prompt('Digite o nome da nova tag:');
        if (!newTag || !newTag.trim()) return;

        const currentTags = chat.tags || [];
        if (currentTags.includes(newTag.trim())) return;

        const updatedTags = [...currentTags, newTag.trim()];

        try {
            await supabase
                .from('whatsapp_chats')
                .update({ tags: updatedTags })
                .eq('id', chat.id);
        } catch (error) {
            console.error('Error adding tag:', error);
            alert('Erro ao adicionar tag.');
        }
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!supabase) return;
        const currentTags = chat.tags || [];
        const updatedTags = currentTags.filter((t: string) => t !== tagToRemove);

        try {
            await supabase
                .from('whatsapp_chats')
                .update({ tags: updatedTags })
                .eq('id', chat.id);
        } catch (error) {
            console.error('Error removing tag:', error);
            alert('Erro ao remover tag.');
        }
    };

    return (
        <div className="w-80 border-l bg-background hidden lg:block overflow-y-auto">
            <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Detalhes do Contato</h3>
            </div>

            <div className="p-4 space-y-6">
                {/* Contact Info */}
                <div className="flex flex-col items-centertext-center space-y-2">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden mx-auto">
                        {chat.profile_pic_url ? (
                            <img src={chat.profile_pic_url} alt={chat.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-2xl font-bold text-muted-foreground">
                                {chat.name?.charAt(0) || '?'}
                            </span>
                        )}
                    </div>
                    <div className="text-center">
                        <h4 className="font-medium text-lg">{chat.name}</h4>
                        <p className="text-sm text-muted-foreground">{chat.phone_number}</p>
                    </div>
                </div>

                {/* Sync Status */}
                <Card className="shadow-none">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm">Integração CRM</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                        {chat.contact_id ? (
                            <div className="flex items-center gap-2 text-sm">
                                <UserPlus className="w-4 h-4 text-green-500" />
                                <span>Contato Sincronizado</span>
                            </div>
                        ) : (
                            <Button variant="outline" className="w-full" size="sm" onClick={handleSaveContact} disabled={isLoadingContact}>
                                {isLoadingContact ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                                Salvar no CRM
                            </Button>
                        )}

                        {chat.deal_id ? (
                            <div className="flex items-center gap-2 text-sm mt-2">
                                <Briefcase className="w-4 h-4 text-purple-500" />
                                <span>Em Negociação</span>
                            </div>
                        ) : (
                            <Button variant="outline" className="w-full" size="sm" onClick={handleCreateDeal} disabled={isLoadingDeal}>
                                {isLoadingDeal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Briefcase className="w-4 h-4 mr-2" />}
                                Criar Deal
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Tags */}
                <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Tag className="w-4 h-4" /> Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {chat.tags && chat.tags.map((tag: string) => (
                            <span key={tag} onClick={() => handleRemoveTag(tag)} title="Clique para remover">
                                <Badge variant="secondary" className="cursor-pointer hover:bg-destructive hover:text-white">
                                    {tag}
                                </Badge>
                            </span>
                        ))}
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs border border-dashed text-muted-foreground w-full mt-2" onClick={handleAddTag}>
                            + Adicionar Tag
                        </Button>
                    </div>
                </div>

                {/* AI Assistants */}
                <div className="pt-4 border-t">
                    <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white">
                        <Bot className="w-4 h-4 mr-2" />
                        Analisar Conversa com IA
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                        A IA pode resumir o pedido e sugerir respostas.
                    </p>
                </div>

            </div>
        </div>
    );
}
