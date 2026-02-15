
import React, { useState } from 'react';
import { Message, Role } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${
          isUser ? 'ml-3 bg-blue-600' : 'mr-3 bg-slate-700 border border-slate-600'
        }`}>
          <i className={`fas ${isUser ? 'fa-user' : 'fa-brain text-blue-400'} text-sm`}></i>
        </div>

        {/* Bubble */}
        <div className={`relative px-4 py-3 rounded-2xl shadow-md transition-all ${
          isUser 
            ? 'bg-[#1e3a8a] text-white rounded-tr-none' 
            : 'bg-[#1f2937] text-gray-100 border border-slate-700 rounded-tl-none'
        }`}>
          <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">
            {message.imageUrl && (
              <div className="mb-3 mt-1 relative group">
                {!imageLoaded && (
                  <div className="w-full aspect-square bg-slate-800 animate-pulse rounded-xl flex items-center justify-center">
                    <i className="fas fa-circle-notch animate-spin text-blue-500"></i>
                  </div>
                )}
                <img 
                  src={message.imageUrl} 
                  alt="IA Generated" 
                  className={`w-full h-auto rounded-xl shadow-2xl border border-slate-700/50 cursor-zoom-in transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImageLoaded(true)}
                  onClick={() => window.open(message.imageUrl, '_blank')}
                />
                {imageLoaded && (
                  <a 
                    href={message.imageUrl} 
                    download="megamente-ia.png"
                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/80 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Baixar imagem"
                  >
                    <i className="fas fa-download text-xs"></i>
                  </a>
                )}
              </div>
            )}
            
            {message.content || (message.type === 'text' && !message.content) ? (
              <span>{message.content}</span>
            ) : message.type === 'image' && !message.imageUrl ? (
              <div className="flex space-x-1 py-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-.5s]"></div>
              </div>
            ) : null}
          </div>
          <div className={`text-[10px] mt-2 opacity-50 font-bold ${isUser ? 'text-right' : 'text-left'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
