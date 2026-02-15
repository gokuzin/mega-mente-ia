
import React, { useState, useRef, useEffect } from 'react';
import { Message, Role, ChatSession } from './types';
import { geminiService } from './services/geminiService';
import ChatMessage from './components/ChatMessage';

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedSessions = localStorage.getItem('mega_mente_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        const formatted = parsed.map((s: any) => ({
          ...s,
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
        setSessions(formatted);
      } catch (e) {
        console.error("Erro ao carregar sessões", e);
      }
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('mega_mente_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessions, currentSessionId]);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const createNewChat = () => {
    setCurrentSessionId(null);
    setInput('');
    setSidebarOpen(false);
  };

  const generateTitle = (text: string) => {
    const cleanText = text.trim();
    if (cleanText.length <= 30) return cleanText;
    return cleanText.substring(0, 27) + '...';
  };

  const isImageRequest = (text: string) => {
    const keywords = [
      'gere uma imagem', 'crie uma imagem', 'desenhe', 'gerar imagem', 
      'gera uma imagem', 'faça um desenho', 'crie um desenho', 'gerar foto',
      'crie uma foto', 'gera imagem'
    ];
    const lowerText = text.toLowerCase();
    return keywords.some(k => lowerText.includes(k));
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: input,
      timestamp: new Date(),
      type: 'text'
    };

    let targetSessionId = currentSessionId;
    let newSessions = [...sessions];

    if (!targetSessionId) {
      targetSessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: targetSessionId,
        title: generateTitle(input),
        messages: [userMessage],
      };
      newSessions = [newSession, ...sessions];
      setSessions(newSessions);
      setCurrentSessionId(targetSessionId);
    } else {
      newSessions = sessions.map(s => 
        s.id === targetSessionId 
          ? { ...s, messages: [...s.messages, userMessage] } 
          : s
      );
      setSessions(newSessions);
    }

    const tempAiMessageId = (Date.now() + 1).toString();
    const isImg = isImageRequest(input);

    const aiPlaceholder: Message = {
      id: tempAiMessageId,
      role: Role.MODEL,
      content: '',
      timestamp: new Date(),
      type: isImg ? 'image' : 'text'
    };

    setSessions(prev => prev.map(s => 
      s.id === targetSessionId 
        ? { ...s, messages: [...s.messages, aiPlaceholder] } 
        : s
    ));

    const promptText = input;
    setInput('');
    setIsLoading(true);

    try {
      if (isImg) {
        // Fluxo de Geração de Imagem
        const result = await geminiService.generateImage(promptText);
        setSessions(prev => prev.map(s => 
          s.id === targetSessionId 
            ? { 
                ...s, 
                messages: s.messages.map(m => 
                  m.id === tempAiMessageId ? { 
                    ...m, 
                    content: result.text, 
                    imageUrl: result.imageUrl 
                  } : m
                ) 
              } 
            : s
        ));
      } else {
        // Fluxo de Chat Normal (Streaming)
        const activeSession = newSessions.find(s => s.id === targetSessionId);
        const history = activeSession?.messages.slice(0, -1) || [];
        let fullResponse = '';

        const stream = geminiService.streamChat(history, promptText);
        
        for await (const chunk of stream) {
          fullResponse += chunk;
          setSessions(prev => prev.map(s => 
            s.id === targetSessionId 
              ? { 
                  ...s, 
                  messages: s.messages.map(m => 
                    m.id === tempAiMessageId ? { ...m, content: fullResponse } : m
                  ) 
                } 
              : s
          ));
        }
      }
    } catch (error) {
      console.error("Erro na Mega Mente:", error);
      setSessions(prev => prev.map(s => 
        s.id === targetSessionId 
          ? { 
              ...s, 
              messages: s.messages.map(m => 
                m.id === tempAiMessageId ? { 
                  ...m, 
                  content: "Ocorreu um erro na conexão neural ou ao gerar sua imagem. Tente novamente.",
                  type: 'text'
                } : m
              ) 
            } 
          : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Deseja apagar esta conversa?")) {
        const updated = sessions.filter(s => s.id !== id);
        setSessions(updated);
        if (currentSessionId === id) setCurrentSessionId(null);
        localStorage.setItem('mega_mente_sessions', JSON.stringify(updated));
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-slate-200 overflow-hidden font-sans select-none">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#111827] border-r border-slate-800 transition-transform duration-300 ease-in-out transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40 rotate-3">
                <i className="fas fa-brain text-white text-xl"></i>
              </div>
              <h1 className="text-xl font-black tracking-tighter text-white">
                Mega Mente
              </h1>
            </div>

            <button 
              onClick={createNewChat}
              className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] font-semibold text-sm"
            >
              <i className="fas fa-plus"></i>
              <span>Novo Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-2">Recentes</p>
            
            {sessions.length === 0 ? (
              <div className="px-4 py-8 text-xs text-slate-600 text-center bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                Sua lista está vazia
              </div>
            ) : (
              sessions.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => {
                    setCurrentSessionId(session.id);
                    setSidebarOpen(false);
                  }}
                  className={`group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all ${
                    currentSessionId === session.id 
                      ? 'bg-blue-900/30 border border-blue-800/50 text-blue-100 shadow-inner' 
                      : 'hover:bg-slate-800/60 text-slate-400 border border-transparent'
                  }`}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <i className={`fas fa-message mr-3 text-xs ${currentSessionId === session.id ? 'text-blue-400' : 'text-slate-600'}`}></i>
                    <span className="text-sm truncate font-medium">{session.title}</span>
                  </div>
                  <button 
                    onClick={(e) => deleteSession(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all"
                  >
                    <i className="fas fa-trash-alt text-[10px]"></i>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center space-x-3 p-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs border border-slate-700">
                    <i className="fas fa-user text-slate-400"></i>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-200 truncate">Usuário Conectado</p>
                    <p className="text-[10px] text-green-500 font-bold uppercase">Online</p>
                </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative min-w-0 bg-[#0a0a0c]">
        <header className="h-16 flex items-center px-4 md:px-8 glass-header border-b border-slate-800 sticky top-0 z-30">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="md:hidden w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <i className="fas fa-bars-staggered text-xl"></i>
          </button>
          
          <div className="ml-2 md:ml-0 flex flex-col">
            <h2 className="text-sm font-bold text-white tracking-tight">
              {currentSession?.title || 'Mega Mente AI'}
            </h2>
            <div className="flex items-center space-x-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                <span className="text-[9px] text-blue-400 uppercase font-black tracking-widest">Protocolo Neural Ativo</span>
            </div>
          </div>

          <div className="ml-auto flex items-center space-x-2 md:space-x-4">
             <button className="hidden sm:flex text-slate-400 hover:text-white transition-colors p-2 text-sm items-center space-x-2">
                <i className="fas fa-image"></i>
                <span className="text-xs font-medium">Geração Visual</span>
             </button>
             <div className="h-4 w-[1px] bg-slate-800 hidden sm:block"></div>
             <button className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                <i className="fas fa-circle-info"></i>
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-6 custom-scrollbar pb-32">
          <div className="max-w-4xl mx-auto w-full">
            {messages.length === 0 ? (
                <div className="h-[70vh] flex flex-col items-center justify-center text-center px-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-900 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-blue-900/40 relative">
                        <i className="fas fa-brain text-5xl text-white"></i>
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-[#0a0a0c] rounded-full"></div>
                    </div>
                    <h3 className="text-4xl font-black text-white mb-4 tracking-tighter">O que vamos criar hoje?</h3>
                    <p className="text-slate-400 max-w-md text-lg font-medium leading-relaxed mb-10">
                        Sou a Mega Mente, agora também posso transformar suas palavras em imagens incríveis.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                        {[
                            { icon: 'fa-image', title: 'Arte Visual', text: 'Gere uma imagem de um astronauta surfando no espaço' },
                            { icon: 'fa-terminal', title: 'Programação', text: 'Como criar um carrossel em React?' },
                            { icon: 'fa-wand-sparkles', title: 'Design', text: 'Gere uma imagem de uma cidade cyberpunk' },
                            { icon: 'fa-message', title: 'Conversa', text: 'Qual o sentido da vida?' }
                        ].map((item) => (
                            <button 
                                key={item.text}
                                onClick={() => setInput(item.text)}
                                className="flex flex-col items-start p-4 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-all group text-left"
                            >
                                <i className={`fas ${item.icon} text-blue-500 mb-2 opacity-70 group-hover:opacity-100`}></i>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{item.title}</p>
                                <p className="text-sm text-slate-200 font-medium">{item.text}</p>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg) => (
                  <div key={msg.id} className="animate-chat-in">
                    <ChatMessage message={msg} />
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c] to-transparent z-20">
          <form 
            onSubmit={handleSend}
            className="max-w-4xl mx-auto"
          >
            <div className="relative flex items-center bg-[#1f2937] border border-slate-700/50 rounded-[1.8rem] shadow-2xl focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 transition-all p-2 pr-3">
              <button 
                type="button" 
                onClick={() => setInput("Gere uma imagem de ")}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors"
                title="Pedir imagem"
              >
                <i className="fas fa-palette"></i>
              </button>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Pergunte algo ou peça: 'Gere uma imagem de...'"
                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-100 placeholder-slate-500 py-3 px-2 resize-none max-h-32 min-h-[44px] text-sm md:text-base scroll-none select-text"
                rows={1}
              />

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`h-10 w-10 flex items-center justify-center rounded-2xl transition-all ${
                  input.trim() && !isLoading 
                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 active:scale-90' 
                    : 'bg-slate-800 text-slate-600'
                }`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <i className="fas fa-arrow-up text-sm"></i>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-600 text-center mt-3 font-bold uppercase tracking-[0.3em]">
               Mega Mente AI • Geração de Imagem & Texto
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};

export default App;
