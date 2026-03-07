import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { generateChatResponse, improveText } from '../services/ai';
import { Send, Bot, User, Sparkles, Loader2, Wand2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../utils/cn';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const { presentation, activeSlideId, selectedElementId, updateElement } = useEditorStore();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hi! I am your AI Pitch Assistant. How can I help you improve your presentation today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSlide = presentation?.slides.find(s => s.id === activeSlideId);
  const selectedElement = activeSlide?.elements.find(e => e.id === selectedElementId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context
      let context = `Presentation Title: ${presentation?.title}\n`;
      if (activeSlide) {
        context += `Current Slide Content:\n`;
        activeSlide.elements.forEach(el => {
          if (el.type === 'text') {
            context += `- ${el.content}\n`;
          }
        });
      }

      const responseText = await generateChatResponse(userMessage.content, context);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText || 'Sorry, I could not generate a response.'
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Sorry, an error occurred while processing your request.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImproveText = async () => {
    if (!selectedElement || selectedElement.type !== 'text' || !selectedElement.content || !activeSlideId) return;
    
    setIsLoading(true);
    try {
      const improved = await improveText(selectedElement.content);
      if (improved) {
        updateElement(activeSlideId, selectedElement.id, { content: improved });
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: 'I have improved the selected text for you!' 
        }]);
      }
    } catch (error) {
      console.error('Improve text error:', error);
      console.log('Failed to improve text.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-10">
      <div className="p-4 border-b border-gray-200 bg-indigo-50/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
          <Wand2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">AI Assistant</h2>
          <p className="text-xs text-gray-500">Powered by NotebookLM</p>
        </div>
      </div>

      {/* Quick Actions */}
      {selectedElement && selectedElement.type === 'text' && (
        <div className="p-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Quick Actions</p>
          <button 
            onClick={handleImproveText}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Improve Selected Text
          </button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(
              "flex gap-3 max-w-[90%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
              msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-indigo-600"
            )}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={cn(
              "p-3 rounded-2xl text-sm shadow-sm",
              msg.role === 'user' 
                ? "bg-indigo-600 text-white rounded-tr-none" 
                : "bg-white border border-gray-100 text-gray-800 rounded-tl-none prose prose-sm prose-indigo"
            )}>
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[80%]">
            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-indigo-600 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-white border border-gray-100 rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="text-sm text-gray-500">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="relative flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask AI to generate content, summarize, or design..."
            className="w-full max-h-32 min-h-[44px] p-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm transition-shadow"
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-300 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-2">
          AI can make mistakes. Consider verifying important information.
        </p>
      </div>
    </div>
  );
}
