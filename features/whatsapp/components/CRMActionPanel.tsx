'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, UserPlus, Briefcase, Bot } from 'lucide-react';

export function CRMActionPanel({ chat }: { chat: any }) {
    if (!chat) return null;

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
                            <Button variant="outline" className="w-full" size="sm">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Salvar no CRM
                            </Button>
                        )}

                        {chat.deal_id ? (
                            <div className="flex items-center gap-2 text-sm mt-2">
                                <Briefcase className="w-4 h-4 text-purple-500" />
                                <span>Em Negociação</span>
                            </div>
                        ) : (
                            <Button variant="outline" className="w-full" size="sm">
                                <Briefcase className="w-4 h-4 mr-2" />
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
                        <Badge variant="secondary">Nova Lead</Badge>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendente</Badge>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs border border-dashed text-muted-foreground w-full mt-2">
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
