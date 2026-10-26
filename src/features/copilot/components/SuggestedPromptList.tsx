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
      <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
        <span>Suggested Investigation & Verification Prompts:</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {prompts.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectPrompt(p)}
            className="flex items-center justify-between gap-2 rounded-lg border border-violet-900/40 bg-navy-950/60 p-2.5 text-left text-xs transition hover:border-cyan-400/60 hover:bg-navy-800/60 group"
          >
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-200 group-hover:text-cyan-300">
                <span>{p.title}</span>
                <span className="rounded bg-violet-900/50 px-1.5 py-0.2 text-[9px] font-mono text-violet-300 uppercase">
                  {p.category}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                {p.prompt}
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
