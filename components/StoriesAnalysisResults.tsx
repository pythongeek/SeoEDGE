
import React from 'react';
import type { StoriesAnalysis, StoryPerformance, TopicSuggestion, FormatGuideline } from '../types';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

const PerformanceBadge: React.FC<{ change: string }> = ({ change }) => {
    const isPositive = change.startsWith('+');
    const color = isPositive ? 'text-green-300 bg-green-900/80 border-green-700/50' : 'text-red-300 bg-red-900/80 border-red-700/50';
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${color}`}>
            {change}
        </span>
    );
}

export const StoriesAnalysisResults: React.FC<{ analysis: StoriesAnalysis }> = ({ analysis }) => {
    const { top_performing_stories, topic_plan, format_guidelines } = analysis;

    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-lg overflow-hidden animate-fade-in space-y-6 p-6">
            <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <BookOpenIcon className="w-7 h-7 text-cyan-400" />
                    Google Stories Analysis
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                    Key insights and recommendations based on your story performance data.
                </p>
            </div>

            {/* Top Performing Stories */}
            <div>
                 <h4 className="text-lg font-semibold text-white mb-4">Top Performing Stories</h4>
                 <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                         <thead className="bg-gray-900/50 text-gray-300 uppercase tracking-wider text-xs">
                             <tr>
                                 <th className="p-3">Story URL</th>
                                 <th className="p-3 text-right">Impressions</th>
                                 <th className="p-3 text-right">Clicks</th>
                                 <th className="p-3 text-right">CTR</th>
                                 <th className="p-3 text-center">Performance vs Avg.</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-700/50">
                             {top_performing_stories.map((story) => (
                                 <tr key={story.url} className="hover:bg-gray-800/50 transition-colors">
                                     <td className="p-3 font-mono truncate max-w-xs" title={story.url}>{story.url}</td>
                                     <td className="p-3 text-right text-white font-medium">{story.impressions.toLocaleString()}</td>
                                     <td className="p-3 text-right text-white font-medium">{story.clicks.toLocaleString()}</td>
                                     <td className="p-3 text-right text-white font-medium">{(story.ctr * 100).toFixed(2)}%</td>
                                     <td className="p-3 text-center">
                                        <PerformanceBadge change={story.performance_vs_average} />
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
            </div>

            {/* Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-700">
                {/* Topic Plan */}
                <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <LightBulbIcon className="w-5 h-5 text-yellow-300"/>
                        Suggested Topic Plan
                    </h4>
                    <div className="space-y-3">
                        {topic_plan.map((topic, index) => (
                            <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/60">
                                <p className="font-semibold text-cyan-300">{topic.suggested_title}</p>
                                <p className="text-xs text-gray-400 mt-1 italic">
                                    <strong>Reasoning:</strong> {topic.reasoning}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Format Guidelines */}
                 <div>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-400"/>
                        Format Guidelines
                    </h4>
                     <div className="space-y-3">
                        {format_guidelines.map((guideline, index) => (
                            <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/60">
                                <p className="font-semibold text-cyan-300">{guideline.guideline}</p>
                                <p className="text-xs text-gray-400 mt-1 italic">
                                    <strong>Reasoning:</strong> {guideline.reasoning}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};
