
import React from 'react';
import { Loader } from './Loader';
import { NewspaperIcon } from './icons/NewspaperIcon';
import { DiscoverNewsResults } from './DiscoverNewsResults';
import type { DiscoverNewsAnalysis } from '../types';

interface DiscoverNewsAnalyzerProps {
  isLoading: boolean;
  error: string | null;
  analysis: DiscoverNewsAnalysis | null;
  onAnalyze: () => void;
}

export const DiscoverNewsAnalyzer: React.FC<DiscoverNewsAnalyzerProps> = ({ isLoading, error, analysis, onAnalyze }) => {

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Discover & News Content Audit</h2>
        <p className="text-gray-400 mb-6">
          Analyze your content's performance in Google Discover and News. The AI will identify success patterns and generate a content plan to replicate top performers.
        </p>
        <button
          onClick={onAnalyze}
          disabled={isLoading}
          className="w-full sm:w-auto flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-md transition-all duration-200 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isLoading ? (
            <>
              <Loader className="w-5 h-5 mr-2" />
              Auditing Content...
            </>
          ) : (
            'Create Content Playbook'
          )}
        </button>
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
            <h3 className="text-xl font-semibold text-white">Reverse-Engineering Success...</h3>
            <p className="text-gray-400 mt-2">The AI is analyzing your top Discover and News content to build a playbook.</p>
        </div>
      )}
      
      {analysis && !isLoading && (
         <DiscoverNewsResults analysis={analysis} />
      )}

      {!analysis && !isLoading && !error && (
        <div className="text-center p-12 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
            <div className="flex flex-col items-center">
                <NewspaperIcon className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300">Ready to Build Your Playbook?</h3>
                <p className="text-gray-500 mt-2 max-w-sm">Click the button to find out what makes your content successful in Discover and News.</p>
            </div>
        </div>
      )}
    </div>
  );
};
