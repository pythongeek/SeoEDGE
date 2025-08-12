
import React from 'react';
import type { SeoSuggestion } from '../types';
import { Checklist } from './Checklist';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface SuggestionCardProps {
  suggestions: SeoSuggestion;
  pageUrl: string;
}

const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        // You could add a toast notification here
        console.log('Copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};

const SuggestionItem: React.FC<{ title: string; children: React.ReactNode; copyText?: string }> = ({ title, children, copyText }) => (
    <div className="bg-gray-800/70 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
            <h4 className="text-md font-semibold text-cyan-300">{title}</h4>
            {copyText && (
                <button 
                    onClick={() => copyToClipboard(copyText)} 
                    className="p-1 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                    title={`Copy ${title}`}
                >
                    <ClipboardIcon className="w-4 h-4" />
                </button>
            )}
        </div>
        <div className="text-gray-300 text-sm leading-relaxed">{children}</div>
    </div>
);

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestions, pageUrl }) => {
  const confidenceColor = suggestions.confidence > 0.7 ? 'text-green-400' : suggestions.confidence > 0.4 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-lg overflow-hidden animate-fade-in">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <LightBulbIcon className="w-7 h-7 text-yellow-300" />
              AI-Generated Suggestions
            </h3>
            <p className="text-gray-400 text-sm mt-1 truncate" title={pageUrl}>{pageUrl}</p>
          </div>
          <div className="mt-3 sm:mt-0 flex items-center gap-2 text-lg font-bold">
            <span className="text-gray-400 text-sm font-medium">Confidence:</span>
            <span className={confidenceColor}>
              {(suggestions.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
        <SuggestionItem title="Optimized Title" copyText={suggestions.title}>
            <p className="font-mono bg-gray-900 p-2 rounded-md">{suggestions.title}</p>
        </SuggestionItem>
        <SuggestionItem title="Optimized Meta Description" copyText={suggestions.meta_description}>
            <p className="font-mono bg-gray-900 p-2 rounded-md">{suggestions.meta_description}</p>
        </SuggestionItem>
        
        <div className="md:col-span-2">
            <SuggestionItem title="Content Summary">
                <p>{suggestions.summary}</p>
            </SuggestionItem>
        </div>

        <div className="md:col-span-1">
             <SuggestionItem title="H2 Suggestions">
                <ul className="space-y-2">
                    {suggestions.h2_suggestions.map((h2, index) => (
                        <li key={index} className="flex items-start">
                            <span className="text-cyan-400 mr-2 mt-1">&#8227;</span>
                            <span>{h2}</span>
                        </li>
                    ))}
                </ul>
            </SuggestionItem>
        </div>
        
        <div className="md:col-span-1">
            <Checklist items={suggestions.seo_checklist} />
        </div>
      </div>
    </div>
  );
};
