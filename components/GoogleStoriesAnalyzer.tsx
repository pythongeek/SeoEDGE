
import React from 'react';
import { Loader } from './Loader';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { StoriesAnalysisResults } from './StoriesAnalysisResults';
import type { StoriesAnalysis } from '../types';

interface GoogleStoriesAnalyzerProps {
  isLoading: boolean;
  error: string | null;
  analysis: StoriesAnalysis | null;
  onAnalyze: () => void;
}

export const GoogleStoriesAnalyzer: React.FC<GoogleStoriesAnalyzerProps> = ({ isLoading, error, analysis, onAnalyze }) => {

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Analyze Google Stories Performance</h2>
        <p className="text-gray-400 mb-6">
          Click the button to analyze your Google Stories data. The AI will identify top performers, suggest new topics, and provide formatting guidelines to boost engagement.
        </p>
        <button
          onClick={onAnalyze}
          disabled={isLoading}
          className="w-full sm:w-auto flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-md transition-all duration-200 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isLoading ? (
            <>
              <Loader className="w-5 h-5 mr-2" />
              Analyzing Stories...
            </>
          ) : (
            'Analyze Stories'
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
            <h3 className="text-xl font-semibold text-white">Analyzing Story Performance</h3>
            <p className="text-gray-400 mt-2">The AI is reviewing your stories' data to find actionable insights.</p>
        </div>
      )}
      
      {analysis && !isLoading && (
         <StoriesAnalysisResults analysis={analysis} />
      )}

      {!analysis && !isLoading && !error && (
        <div className="text-center p-12 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
            <div className="flex flex-col items-center">
                <BookOpenIcon className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300">Ready to Optimize Your Stories?</h3>
                <p className="text-gray-500 mt-2 max-w-sm">Click the analysis button to get started.</p>
            </div>
        </div>
      )}
    </div>
  );
};
