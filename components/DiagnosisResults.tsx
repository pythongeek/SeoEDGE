
import React from 'react';
import type { TrafficDeclineDiagnosis, AffectedPage, Task } from '../types';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { Loader } from './Loader';
import { CheckCircleIcon } from './icons/CheckCircleIcon';


const StatCard: React.FC<{ title: string; value: string; change: number }> = ({ title, value, change }) => {
    const isPositive = change > 0;
    const changeColor = isPositive ? 'text-green-400' : 'text-red-400';
    const changeIcon = isPositive ? '↑' : '↓';

    return (
        <div className="bg-gray-800/70 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400">{title}</h4>
            <div className="flex items-baseline justify-between mt-1">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className={`text-md font-bold ${changeColor} flex items-center`}>
                    {changeIcon} {Math.abs(change * 100).toFixed(1)}%
                </p>
            </div>
        </div>
    );
};

const getCauseChipStyle = (cause: AffectedPage['causeCategory']) => {
    switch (cause) {
        case 'Ranking Loss':
            return 'bg-red-900/80 text-red-300 border-red-700/50';
        case 'CTR Drop':
            return 'bg-yellow-900/80 text-yellow-300 border-yellow-700/50';
        case 'Seasonal Decline':
            return 'bg-blue-900/80 text-blue-300 border-blue-700/50';
        default:
            return 'bg-gray-700 text-gray-300';
    }
}

interface DiagnosisResultsProps {
    diagnosis: TrafficDeclineDiagnosis;
    isWorkflowLoading: boolean;
    workflowError: string | null;
    createdTasks: Task[] | null;
    onCreateWorkflow: (diagnosis: TrafficDeclineDiagnosis) => void;
}

export const DiagnosisResults: React.FC<DiagnosisResultsProps> = ({ diagnosis, isWorkflowLoading, workflowError, createdTasks, onCreateWorkflow }) => {
    const { summary, affectedPages } = diagnosis;

    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-lg overflow-hidden animate-fade-in space-y-6 p-6">
            <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <ChartBarIcon className="w-7 h-7 text-cyan-400" />
                    Traffic Decline Analysis
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                    Comparing period {summary.preUpdatePeriod.start} to {summary.preUpdatePeriod.end} with {summary.postUpdatePeriod.start} to {summary.postUpdatePeriod.end}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Impressions" value={summary.impressionsChange > 0 ? 'Increased' : 'Decreased'} change={summary.impressionsChange} />
                <StatCard title="Clicks" value={summary.clicksChange > 0 ? 'Increased' : 'Decreased'} change={summary.clicksChange} />
                <StatCard title="Avg. CTR" value={summary.ctrChange > 0 ? 'Improved' : 'Declined'} change={summary.ctrChange} />
            </div>

            <div>
                 <h4 className="text-lg font-semibold text-white mb-4">Top Affected Pages</h4>
                 <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                         <thead className="bg-gray-900/50 text-gray-300 uppercase tracking-wider text-xs">
                             <tr>
                                 <th className="p-3">URL</th>
                                 <th className="p-3 text-right">Impression Loss</th>
                                 <th className="p-3 text-right">Click Loss</th>
                                 <th className="p-3">Suspected Cause</th>
                                 <th className="p-3 text-right">Priority</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-700/50">
                             {affectedPages.map((page) => (
                                 <tr key={page.url} className="hover:bg-gray-800/50 transition-colors">
                                     <td className="p-3 font-mono truncate max-w-xs" title={page.url}>{page.url}</td>
                                     <td className="p-3 text-right text-red-400 font-medium">{page.impressionLoss.toLocaleString()}</td>
                                     <td className="p-3 text-right text-red-400 font-medium">{page.clickLoss.toLocaleString()}</td>
                                     <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getCauseChipStyle(page.causeCategory)}`}>
                                            {page.causeCategory}
                                        </span>
                                     </td>
                                     <td className="p-3 text-right font-bold text-white">{page.priorityScore.toFixed(1)}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
                <h4 className="text-lg font-semibold text-white mb-4">Content Workflow Planner</h4>
                 {workflowError && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-4" role="alert">
                      <strong className="font-bold">Error: </strong>
                      <span className="block sm:inline">{workflowError}</span>
                    </div>
                )}
                {isWorkflowLoading && (
                     <div className="text-center p-6 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex justify-center items-center mb-4">
                            <Loader className="w-8 h-8 text-cyan-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Generating Editorial Tasks...</h3>
                        <p className="text-gray-400 mt-1">The AI is creating an actionable plan for your team.</p>
                    </div>
                )}
                {!isWorkflowLoading && !createdTasks && (
                     <div className="text-center">
                        <p className="text-gray-400 mb-4">Turn this analysis into an actionable plan for your content editors.</p>
                        <button
                            onClick={() => onCreateWorkflow(diagnosis)}
                            disabled={isWorkflowLoading}
                            className="flex items-center justify-center mx-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-all duration-200 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />
                            Generate Workflow Plan
                        </button>
                    </div>
                )}
                 {createdTasks && !isWorkflowLoading && (
                    <div className="space-y-4">
                         <div className="flex items-center gap-3 p-4 bg-green-900/50 border border-green-700 text-green-300 rounded-lg">
                            <CheckCircleIcon className="w-8 h-8 flex-shrink-0"/>
                            <div>
                                <h5 className="font-bold">Workflow Generated!</h5>
                                <p className="text-sm">{createdTasks.length} tasks have been created and assigned to your editors.</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {createdTasks.map(task => (
                                <div key={task.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/80">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-white">{task.action}</p>
                                            <p className="text-xs text-gray-400 font-mono">{task.pageUrl}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <p className="text-xs text-gray-400">Assignee</p>
                                            <p className="font-semibold text-cyan-300">{task.assigneeName}</p>
                                        </div>
                                    </div>
                                    <ul className="mt-3 list-disc list-inside space-y-1 text-sm text-gray-300">
                                        {task.items.map((item, index) => <li key={index}>{item}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
