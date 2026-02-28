'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Send, File, Check, CheckCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CRMActionPanel } from './CRMActionPanel';

export function ChatLayout() {
    const [chats, setChats] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [activeChat, setActiveChat] = useState<any>(null);
    const [messageInput, setMessageInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchChats();
        setupRealtime();
    }, []);

    const fetchChats = async () => {
        if (!supabase) return;
        const { data } = await supabase
            .from('whatsapp_chats')
            .select('*')
            .order('last_message_at', { ascending: false });
        if (data) setChats(data);
    };

    const fetchMessages = async (chatId: string) => {
        if (!supabase) return;
        const { data } = await supabase
            .from('whatsapp_messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('timestamp', { ascending: true });
        if (data) setMessages(data);
        scrollToBottom();
    };

    const setupRealtime = () => {
        if (!supabase) return () => { };
        const channel = supabase
            .channel('whatsapp_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, payload => {
                const newRecord = payload.new as any;
                if (newRecord) {
                    setMessages(prev => {
                        const isDuplicate = prev.some(m => m.id === newRecord.id);
                        if (isDuplicate) return prev;
                        return [...prev, newRecord];
                    });
                    scrollToBottom();
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_chats' }, payload => {
                const newRecord = payload.new as any;
                if (newRecord) {
                    setChats(prev => {
                        const existing = prev.find(c => c.id === newRecord.id);
                        if (existing) {
                            return prev.map(c => c.id === newRecord.id ? newRecord : c)
                                .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
                        }
                        return [newRecord, ...prev];
                    });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !activeChat) return;

        const tmpText = messageInput;
        setMessageInput('');

        // Optimistic UI Append
        const tempMsg = {
            id: `temp-${Date.now()}`,
            content: tmpText,
            is_from_me: true,
            status: 'PENDING',
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom();

        await fetch('/api/whatsapp/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: activeChat.id, text: tmpText })
        });
        // Webhook or DB Realtime will update it
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    return (
        <Card className="flex h-[80vh] overflow-hidden border">
            {/* SIDEBAR: CHATS LIST */}
            <div className="w-80 border-r flex flex-col bg-muted/10">
                <div className="p-4 border-b bg-background">
                    <h2 className="font-semibold text-lg mb-4">Conversas</h2>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                        <input placeholder="Buscar contatos..." className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-9" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {chats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => { setActiveChat(chat); fetchMessages(chat.id); }}
                            className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors flex items-center gap-3 ${activeChat?.id === chat.id ? 'bg-primary/5' : ''}`}
                        >
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                {chat.profile_pic_url ? (
                                    <img src={chat.profile_pic_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-medium text-primary">{(chat.name || chat.phone_number).substring(0, 2)}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-medium truncate text-sm">{chat.name || chat.phone_number}</h4>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{chat.last_message_text}</p>
                            </div>
                            {chat.unread_count > 0 && (
                                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                    {chat.unread_count}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* MAIN CHAT AREA */}
            {activeChat ? (
                <>
                    <div className="flex-1 flex flex-col bg-[#efeae2]/10 dark:bg-background">
                        {/* Chat Header */}
                        <div className="h-16 border-b flex items-center px-6 bg-background">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                                <span className="font-medium text-primary">{(activeChat.name || activeChat.phone_number).substring(0, 2)}</span>
                            </div>
                            <div>
                                <h3 className="font-medium">{activeChat.name || activeChat.phone_number}</h3>
                                <p className="text-xs text-muted-foreground">Local Time: {new Date().toLocaleTimeString()}</p>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 p-6 overflow-y-auto space-y-4" ref={scrollRef}>
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.is_from_me ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] rounded-lg p-3 ${msg.is_from_me ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-background border rounded-tl-none shadow-sm'}`}>
                                        {/* Reply Content (if we supported replies) */}
                                        <p className="text-sm break-words">{msg.content}</p>
                                        <div className={`text-[10px] mt-1 flex justify-end items-center gap-1 ${msg.is_from_me ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {msg.is_from_me && msg.status !== 'PENDING' && (
                                                msg.status === 'READ' ? <CheckCheck className="w-3 h-3 text-blue-300" /> : <Check className="w-3 h-3" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-background border-t">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
                                    <File className="w-5 h-5" />
                                </Button>
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                    placeholder="Digite uma mensagem..."
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 flex-1 bg-muted/50 border-transparent focus-visible:ring-1"
                                />
                                <Button type="submit" size="icon" disabled={!messageInput.trim()} className="shrink-0 bg-green-500 hover:bg-green-600 outline-none">
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </div>

                    {/* CRM ACTION PANEL */}
                    <CRMActionPanel chat={activeChat} />
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-[#efeae2]/10 dark:bg-background">
                    <div className="bg-background p-6 rounded-full shadow-sm border mb-4">
                        <img src="/whatsapp-logo.svg" alt="WA" className="w-16 h-16 opacity-20 grayscale" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    </div>
                    <p className="text-lg font-medium">NossoCRM WhatsApp</p>
                    <p className="text-sm">Selecione uma conversa para começar o atendimento.</p>
                </div>
            )}
        </Card>
    );
}
