
import React from 'react';
import type { DiscoverNewsAnalysis } from '../types';
import { NewspaperIcon } from './icons/NewspaperIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';

const InfoCard: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/60">
        <h5 className="font-semibold text-cyan-300 mb-2">{title}</h5>
        <ul className="space-y-1.5 text-sm text-gray-300">
            {items.map((item, index) => (
                <li key={index} className="flex items-start">
                    <span className="text-cyan-400 mr-2 mt-1">&#8227;</span>
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    </div>
);

export const DiscoverNewsResults: React.FC<{ analysis: DiscoverNewsAnalysis }> = ({ analysis }) => {
    const { pattern_report, content_plan } = analysis;

    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-lg overflow-hidden animate-fade-in space-y-6 p-6">
            <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <NewspaperIcon className="w-7 h-7 text-cyan-400" />
                    Discover & News Playbook
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                    A playbook generated from the common patterns in your successful content.
                </p>
            </div>

            {/* Pattern Report */}
            <div>
                 <h4 className="text-lg font-semibold text-white mb-4">Success Pattern Report</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <InfoCard title="Successful Topics" items={pattern_report.successful_topics} />
                     <InfoCard title="Winning Headline Styles" items={pattern_report.headline_styles} />
                     <InfoCard title="Media Usage Patterns" items={pattern_report.media_usage} />
                 </div>
            </div>

            {/* Content Plan */}
            <div className="pt-6 border-t border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <LightBulbIcon className="w-5 h-5 text-yellow-300"/>
                    Actionable Content Plan
                </h4>
                <div className="space-y-3">
                    {content_plan.map((idea, index) => (
                        <div key={index} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/60">
                            <p className="font-bold text-white">{idea.suggested_headline}</p>
                            <p className="text-xs text-cyan-400 font-semibold mt-1 uppercase tracking-wider">
                                Topic: {idea.target_topic}
                            </p>
                            <p className="text-sm text-gray-400 mt-2 pt-2 border-t border-gray-700/50">
                                <strong>Justification:</strong> {idea.justification}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
