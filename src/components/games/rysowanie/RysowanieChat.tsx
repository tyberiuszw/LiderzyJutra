"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { ChatMessage } from "@/server/types";

interface RysowanieChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  isDrawer: boolean;
  hasSolved: boolean;
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export const RysowanieChat: React.FC<RysowanieChatProps> = ({
  messages,
  currentUserId,
  isDrawer,
  hasSolved,
  onSendMessage,
  disabled = false,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
    setInputText("");
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Chat Header */}
      <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between text-xs font-semibold text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Czat & Zgadywanie
        </span>
        {hasSolved && (
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
            Odgadnięto ✓
          </span>
        )}
        {isDrawer && (
          <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
            Rysujesz 🎨
          </span>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 text-sm">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;

          if (msg.type === "correct") {
            return (
              <div
                key={msg.id}
                className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-600/40 text-emerald-300 flex items-center gap-2 text-xs font-medium"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong className="text-emerald-200">{msg.senderName}</strong> {msg.text}
                </span>
              </div>
            );
          }

          if (msg.type === "close") {
            return (
              <div
                key={msg.id}
                className="p-2 rounded-lg bg-amber-950/40 border border-amber-600/40 text-amber-300 flex items-center gap-2 text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong className="text-amber-200">{msg.senderName}</strong> {msg.text}
                </span>
              </div>
            );
          }

          if (msg.type === "solver") {
            return (
              <div
                key={msg.id}
                className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-200 text-xs"
              >
                <div className="flex items-center justify-between text-[10px] text-emerald-400/80 mb-0.5 font-bold">
                  <span>{msg.senderName} (odgadł)</span>
                </div>
                <p className="break-words">{msg.text}</p>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`p-2 rounded-lg text-xs break-words ${
                isMe
                  ? "bg-cyan-950/40 border border-cyan-800/50 text-cyan-100 ml-3"
                  : "bg-slate-800/70 border border-slate-700/50 text-slate-200 mr-3"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5 font-semibold">
                <span className={isMe ? "text-cyan-300" : "text-slate-300"}>{msg.senderName}</span>
              </div>
              <p>{msg.text}</p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="p-2.5 bg-slate-800/80 border-t border-slate-700/60 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={disabled || isDrawer}
          placeholder={
            isDrawer
              ? "Nie możesz zgadywać podczas rysowania"
              : hasSolved
              ? "Czat z osobami, które odgadły..."
              : "Zgadnij hasło lub napisz wiadomość..."
          }
          className="flex-1 bg-slate-950/80 text-white placeholder-slate-500 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !inputText.trim() || isDrawer}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold p-2 rounded-lg transition-colors"
          title="Wyślij"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
