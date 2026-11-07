"use client";

import React from "react";
import { ChameleonMascot } from "../../mascot/ChameleonMascot";

interface RysowanieWordPickerProps {
  words: string[];
  remainingSeconds: number;
  onSelectWord: (word: string) => void;
}

export const RysowanieWordPicker: React.FC<RysowanieWordPickerProps> = ({
  words,
  remainingSeconds,
  onSelectWord,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Thinking Chameleon Mascot */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-inner">
            <ChameleonMascot state="thinking" size={64} />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-white mb-1">Twoja kolej na rysowanie!</h3>
          <p className="text-xs text-slate-400">
            Wybierz jedno z 3 haseł zanim skończy się czas:
          </p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 font-mono text-sm font-bold">
            Pozostało: {remainingSeconds}s
          </div>
        </div>

        {/* 3 Word Choices */}
        <div className="grid grid-cols-1 gap-3">
          {words.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => onSelectWord(w)}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-slate-800 to-slate-800/90 hover:from-cyan-900/60 hover:to-indigo-900/60 border border-slate-700 hover:border-cyan-400 text-white font-bold text-base tracking-wide transition-all duration-200 shadow hover:shadow-cyan-500/20 active:scale-98"
            >
              {w}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
