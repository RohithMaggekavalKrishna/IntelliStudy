import React, { useState, useRef, useEffect } from 'react';
import { createChat, sendChatMessage, sendChatMessageWithSearch } from '../../services/geminiService';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import { ChatMessage } from '../../types';
import { MessageSquare, Search, X } from 'lucide-react';

interface TutorChatProps {
    projectContent?: string;
    onClose: () => void;
}

const TutorChat: React.FC<TutorChatProps> = ({ projectContent, onClose }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            content: projectContent
                ? "Hello! I'm your AI tutor. I can help you understand your learning materials. What would you like to explore?"
                : "Hello! I'm your AI tutor. I can help answer questions and explain concepts. How can I assist you today?",
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [useWebSearch, setUseWebSearch] = useState(false);
    const [chat] = useState(() => createChat());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!newMessage.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            content: newMessage,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        const messageText = newMessage;
        setNewMessage('');
        setIsLoading(true);

        try {
            let response;

            if (useWebSearch) {
                response = await sendChatMessageWithSearch(messageText);
            } else {
                response = await sendChatMessage(chat, messageText, projectContent);
            }

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                content: response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I couldn\'t generate a response.',
                sender: 'ai',
                timestamp: new Date(),
                sources: useWebSearch ? response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
                    title: chunk.web?.title || 'Source',
                    uri: chunk.web?.uri || '#'
                })) : undefined
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                content: 'Sorry, I encountered an error. Please try again.',
                sender: 'ai',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] mx-4 flex flex-col animate-in zoom-in-95 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                            <MessageSquare size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">AI Tutor Chat</h2>
                            <p className="text-xs text-slate-500 font-medium">
                                {useWebSearch ? 'Web search enabled' : 'Context-aware responses'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setUseWebSearch(!useWebSearch)}
                            className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${useWebSearch
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            title="Toggle web search"
                        >
                            <Search size={16} />
                            {useWebSearch ? 'Search On' : 'Search Off'}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-3xl rounded-2xl p-4 shadow-sm ${message.sender === 'user'
                                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
                                    }`}
                            >
                                <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>

                                {message.sources && message.sources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-100/20">
                                        <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">Sources:</p>
                                        <div className="space-y-1">
                                            {message.sources.map((source, index) => (
                                                <a
                                                    key={index}
                                                    href={source.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm hover:underline block truncate flex items-center gap-1 opacity-90"
                                                >
                                                    🔗 {source.title}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className={`text-[10px] mt-2 ${message.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm p-4 flex items-center gap-3 shadow-sm">
                                <LoadingSpinner size="sm" />
                                <span className="text-slate-500 text-sm font-medium">Thinking...</span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-slate-100 p-4 bg-white">
                    <div className="flex gap-3">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask me anything about your learning materials..."
                            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-slate-50 transition"
                            rows={2}
                            disabled={isLoading}
                        />
                        <Button
                            onClick={sendMessage}
                            disabled={!newMessage.trim() || isLoading}
                            className="self-end h-12 w-12 rounded-xl flex items-center justify-center p-0"
                        >
                            {isLoading ? <LoadingSpinner size="sm" className="text-white" /> : <MessageSquare size={20} />}
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 mt-3 px-1">
                        <div className={`w-2 h-2 rounded-full ${useWebSearch ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                        <span className="text-xs text-slate-500 font-medium">
                            {useWebSearch ? 'Connected to web knowledge' : 'Using project context only'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TutorChat;
