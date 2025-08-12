
import React from 'react';
import type { ChatMessage as ChatMessageType } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChatVisualization } from './ChatVisualization';

interface ChatMessageProps {
  message: ChatMessageType;
  isTyping?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isTyping = false }) => {
  const isUser = message.role === 'user';
  const content = typeof message.content === 'string' ? null : message.content;

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="bg-cyan-600 text-white rounded-lg rounded-br-none px-4 py-3 max-w-lg">
          {typeof message.content === 'string' ? message.content : 'Invalid user message'}
        </div>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
            <SparklesIcon className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="bg-gray-700/60 rounded-lg rounded-bl-none px-4 py-3 max-w-lg space-y-3">
          {isTyping ? (
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span>
            </div>
          ) : (
            <>
              <p className="text-gray-200 whitespace-pre-wrap">{content?.answer_text}</p>
              
              {content?.visualization_data && (
                  <ChatVisualization visualization={content.visualization_data} />
              )}
              
              {content && content.data_source.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-600/50">
                  {content.data_source.map((source, index) => (
                    <span key={index} className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded-full font-mono">
                      {source}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
