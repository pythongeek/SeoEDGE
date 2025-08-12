
import React, { useState } from 'react';
import { DiagnosisResults } from './DiagnosisResults';
import { Loader } from './Loader';
import { ArrowTrendingDownIcon } from './icons/ArrowTrendingDownIcon';
import type { TrafficDeclineDiagnosis as DiagnosisData, Task } from '../types';

interface TrafficDeclineDiagnosisProps {
  isLoading: boolean;
  error: string | null;
  diagnosis: DiagnosisData | null;
  onDiagnose: (coreUpdateDate: string, comparisonWindow: number) => void;
  isWorkflowLoading: boolean;
  workflowError: string | null;
  createdTasks: Task[] | null;
  onCreateWorkflow: (diagnosis: DiagnosisData) => void;
}

export const TrafficDeclineDiagnosis: React.FC<TrafficDeclineDiagnosisProps> = ({ 
    isLoading, 
    error, 
    diagnosis, 
    onDiagnose,
    isWorkflowLoading,
    workflowError,
    createdTasks,
    onCreateWorkflow
}) => {
  const [coreUpdateDate, setCoreUpdateDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [comparisonWindow, setComparisonWindow] = useState<number>(28);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDiagnose(coreUpdateDate, comparisonWindow);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Diagnose Traffic Decline</h2>
        <p className="text-gray-400 mb-6">
          Select a date (e.g., a Google core update) to compare traffic periods and identify the pages most affected by a decline.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-grow w-full sm:w-auto">
            <label htmlFor="updateDate" className="block text-sm font-medium text-gray-400 mb-1">Core Update Date</label>
            <input
              type="date"
              id="updateDate"
              value={coreUpdateDate}
              onChange={(e) => setCoreUpdateDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow"
              required
              disabled={isLoading}
            />
          </div>
          <div className="w-full sm:w-auto">
             <label htmlFor="window" className="block text-sm font-medium text-gray-400 mb-1">Comparison Window</label>
            <select
                id="window"
                value={comparisonWindow}
                onChange={(e) => setComparisonWindow(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow"
                disabled={isLoading}
            >
                <option value={14}>14 Days</option>
                <option value={28}>28 Days</option>
                <option value={90}>90 Days</option>
            </select>
          </div>
          <div className="w-full sm:w-auto self-end">
             <div className="hidden sm:block sm:h-[29px]"></div> 
             <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-md transition-all duration-200 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 mr-2" />
                    Diagnosing...
                  </>
                ) : (
                  'Diagnose'
                )}
              </button>
          </div>
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
            <h3 className="text-xl font-semibold text-white">Analyzing Traffic Data...</h3>
            <p className="text-gray-400 mt-2">Comparing pre and post-update periods. This might take a moment.</p>
        </div>
      )}

      {diagnosis && !isLoading && (
         <DiagnosisResults 
            diagnosis={diagnosis}
            isWorkflowLoading={isWorkflowLoading}
            workflowError={workflowError}
            createdTasks={createdTasks}
            onCreateWorkflow={onCreateWorkflow}
         />
      )}
      
      {!diagnosis && !isLoading && !error && (
        <div className="text-center p-12 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
            <div className="flex flex-col items-center">
                <ArrowTrendingDownIcon className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300">Ready for Diagnosis?</h3>
                <p className="text-gray-500 mt-2 max-w-sm">Select a date and comparison window to begin analyzing traffic changes.</p>
            </div>
        </div>
      )}
    </div>
  );
};
