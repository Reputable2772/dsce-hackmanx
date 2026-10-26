import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { SuggestedPrompt } from '../types';

interface SuggestedPromptListProps {
  prompts: SuggestedPrompt[];
  onSelectPrompt: (p: SuggestedPrompt) => void;
}

export const SuggestedPromptList: React.FC<SuggestedPromptListProps> = ({
  prompts,
  onSelectPrompt
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-mono text-[#687386]">
        <Sparkles className="h-3.5 w-3.5 text-[#5267D8]" />
        <span>Suggested Investigation & Verification Prompts:</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {prompts.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectPrompt(p)}
            className="flex items-center justify-between gap-2 rounded-xl border border-[#E3E8F0] bg-white p-2.5 text-left text-xs transition hover:border-[#5267D8] hover:bg-[#F8FAFC] shadow-xs group"
          >
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-[#202938] group-hover:text-[#5267D8]">
                <span>{p.title}</span>
                <span className="rounded bg-[#EEF2FF] border border-[#CBD5E1] px-1.5 py-0.2 text-[9px] font-mono text-[#5267D8] font-bold uppercase">
                  {p.category}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-[#687386]">
                {p.prompt}
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-[#94A3B8] group-hover:text-[#5267D8] group-hover:translate-x-0.5 transition shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
