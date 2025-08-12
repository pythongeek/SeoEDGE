
import React, { useState } from 'react';
import type { TopicCluster } from '../types';

const TrendIndicator: React.FC<{ score: number }> = ({ score }) => {
    const color = score > 0.7 ? 'bg-green-500' : score > 0.4 ? 'bg-yellow-500' : 'bg-red-500';
    const width = `${Math.max(10, score * 100)}%`;
    return (
        <div className="w-24 bg-gray-700 rounded-full h-2.5" title={`Trend Score: ${score.toFixed(2)}`}>
            <div className={`${color} h-2.5 rounded-full`} style={{ width: width }}></div>
        </div>
    );
};

const TopicCard: React.FC<{ cluster: TopicCluster }> = ({ cluster }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="bg-gray-800/70 p-4 rounded-lg border border-gray-700/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="flex-grow mb-3 sm:mb-0">
                    <h4 className="text-lg font-bold text-cyan-300">{cluster.topic_name}</h4>
                    <p className="text-sm text-green-400 font-semibold mt-1">{cluster.suggested_action}</p>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 text-sm w-full sm:w-auto">
                    <div className="text-center">
                        <div className="text-gray-400 text-xs uppercase">Volume</div>
                        <div className="text-white font-bold text-lg">{cluster.total_volume.toLocaleString()}</div>
                    </div>
                     <div className="text-center">
                        <div className="text-gray-400 text-xs uppercase">Trend</div>
                        <div className="mt-1.5"><TrendIndicator score={cluster.trend_score} /></div>
                    </div>
                    <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                    </button>
                </div>
            </div>
            {isOpen && (
                <div className="mt-4 pt-4 border-t border-gray-700/50 animate-fade-in">
                    <h5 className="text-xs uppercase text-gray-400 font-semibold mb-2">Matched Queries ({cluster.matched_queries.length})</h5>
                    <ul className="text-sm text-gray-300 space-y-1 max-h-48 overflow-y-auto pr-2">
                        {cluster.matched_queries.map((query, index) => (
                            <li key={index} className="font-mono bg-gray-900/50 p-1.5 rounded-md text-xs">{query}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


interface TopicClusterResultsProps {
  clusters: TopicCluster[];
}

export const TopicClusterResults: React.FC<TopicClusterResultsProps> = ({ clusters }) => {
  if (clusters.length === 0) {
    return (
        <div className="text-center p-12 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
            <h3 className="text-xl font-semibold text-gray-300">No Matches Found</h3>
            <p className="text-gray-500 mt-2 max-w-sm mx-auto">Your regex patterns didn't match any queries in the dataset. Try adjusting your patterns or uploading a different file.</p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
        <h3 className="text-2xl font-bold text-white">Generated Topic Clusters</h3>
        {clusters.map((cluster, index) => (
            <TopicCard key={index} cluster={cluster} />
        ))}
    </div>
  );
};
