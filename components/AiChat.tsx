
import React, { useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface AiChatProps {
  messages: ChatMessage[];
  isResponding: boolean;
  onSendMessage: (query: string) => void;
}

const suggestedPrompts = [
    "What are my top 3 pages with the biggest impression loss?",
    "Show me a chart of my top declining pages by priority score.",
    "Suggest a new topic based on my regex analysis.",
    "Summarize the Google Stories analysis."
];

export const AiChat: React.FC<AiChatProps> = ({ messages, isResponding, onSendMessage }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages, isResponding]);

  return (
    <div className="flex flex-col h-[75vh] bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, index) => (
                <ChatMessageComponent key={msg.id} message={msg} />
            ))}
            {isResponding && <ChatMessageComponent message={{id: 'thinking', role: 'assistant', content: { answer_text: '...', data_source: []}}} isTyping={true} />}
            <div ref={messagesEndRef} />
        </div>
        
        {messages.length <= 1 && (
             <div className="p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                {suggestedPrompts.map(prompt => (
                     <button
                        key={prompt}
                        onClick={() => onSendMessage(prompt)}
                        className="p-3 bg-gray-700/50 hover:bg-gray-700 text-left rounded-lg text-sm text-gray-300 transition-colors"
                    >
                        {prompt}
                    </button>
                ))}
            </div>
        )}

        <div className="p-4 border-t border-gray-700">
            <ChatInput onSendMessage={onSendMessage} disabled={isResponding} />
        </div>
    </div>
  );
};
