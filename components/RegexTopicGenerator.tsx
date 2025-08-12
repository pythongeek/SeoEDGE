
import React, { useState } from 'react';
import { Loader } from './Loader';
import { CodeBracketSquareIcon } from './icons/CodeBracketSquareIcon';
import { TopicClusterResults } from './TopicClusterResults';
import type { TopicCluster } from '../types';

interface RegexTopicGeneratorProps {
  isLoading: boolean;
  error: string | null;
  topicClusters: TopicCluster[] | null;
  onAnalyze: (file: File) => void;
}

export const RegexTopicGenerator: React.FC<RegexTopicGeneratorProps> = ({ isLoading, error, topicClusters, onAnalyze }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        if (selectedFile.size > 1024 * 100) { // 100KB limit
            setFileError("File is too large. Please upload a file smaller than 100KB.");
            setFile(null);
        } else if (!['text/plain', 'text/csv'].includes(selectedFile.type)) {
            setFileError("Invalid file type. Please upload a .txt or .csv file.");
            setFile(null);
        } else {
            setFile(selectedFile);
            setFileError(null);
        }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setFileError("Please select a file to analyze.");
      return;
    }
    onAnalyze(file);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Discover Topics with Regex</h2>
        <p className="text-gray-400 mb-6">
          Upload a .txt or .csv file with one regex pattern per line to find and group matching queries from your GSC data.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-grow w-full">
                <label htmlFor="regex-file-upload" className="sr-only">Upload Regex File</label>
                <input
                    type="file"
                    id="regex-file-upload"
                    onChange={handleFileChange}
                    accept=".txt,.csv"
                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-cyan-300 hover:file:bg-gray-600 disabled:opacity-50"
                    disabled={isLoading}
                />
                {file && <p className="text-xs text-gray-500 mt-1">Selected: {file.name}</p>}
                {fileError && <p className="text-xs text-red-400 mt-1">{fileError}</p>}
            </div>
          <button
            type="submit"
            disabled={isLoading || !file}
            className="w-full sm:w-auto flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-md transition-all duration-200 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 mr-2" />
                Processing...
              </>
            ) : (
              'Generate Topics'
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
            <h3 className="text-xl font-semibold text-white">Generating Topic Clusters</h3>
            <p className="text-gray-400 mt-2">Matching queries and asking the AI to find thematic groups...</p>
        </div>
      )}
      
      {topicClusters && !isLoading && (
         <TopicClusterResults clusters={topicClusters} />
      )}

      {!topicClusters && !isLoading && !error && (
        <div className="text-center p-12 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
            <div className="flex flex-col items-center">
                <CodeBracketSquareIcon className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300">Unlock Content Opportunities</h3>
                <p className="text-gray-500 mt-2 max-w-sm">Upload a file of regex patterns to begin discovering new content ideas.</p>
            </div>
        </div>
      )}
    </div>
  );
};
