
import React, { useState } from 'react';
import type { SeoSuggestion } from '../types';
import { SuggestionCard } from './SuggestionCard';
import { Loader } from './Loader';
import { DocumentTextIcon } from './icons/DocumentTextIcon';

interface SeoAiCompanionProps {
  isLoading: boolean;
  error: string | null;
  suggestions: SeoSuggestion | null;
  onAnalyze: (url: string) => void;
  pageUrl: string;
}

export const SeoAiCompanion: React.FC<SeoAiCompanionProps> = ({ isLoading, error, suggestions, onAnalyze, pageUrl }) => {
  const [urlInput, setUrlInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze(urlInput);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Analyze a Page</h2>
        <p className="text-gray-400 mb-6">
          Enter a URL to get AI-powered SEO recommendations. Our companion will analyze its content and provide actionable insights to improve its ranking.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://yourwebsite.com/your-article"
            className="flex-grow bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow"
            required
            disabled={isLoading}
            aria-label="Page URL to analyze"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-md transition-all duration-200 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 mr-2" />
                Analyzing...
              </>
            ) : (
              'Analyze'
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isLoading && (
        <div className="text-center p-8 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex justify-center items-center mb-4">
                 <Loader className="w-12 h-12 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white">Generating Insights</h3>
            <p className="text-gray-400 mt-2">Our AI is analyzing the page. This may take a moment...</p>
        </div>
      )}
      
      {suggestions && !isLoading && (
         <SuggestionCard suggestions={suggestions} pageUrl={pageUrl} />
      )}

      {!suggestions && !isLoading && !error && (
        <div className="text-center p-12 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
            <div className="flex flex-col items-center">
                <DocumentTextIcon className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300">Ready for Insights?</h3>
                <p className="text-gray-500 mt-2 max-w-sm">Enter a URL above to start your SEO analysis. The AI Companion is waiting to help you.</p>
            </div>
        </div>
      )}
    </div>
  );
};
