import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';
import type { ImportJob, ColumnMapping } from '../types';
import { Loader } from './Loader';

interface ColumnMapperProps {
  jobId: string;
  onConfirmMapping: (jobId: string, confirmedSchema: ColumnMapping[]) => void;
  isProcessing: boolean;
}

const TARGET_SCHEMA_FIELDS = [
  { value: 'date', label: 'Date' },
  { value: 'query', label: 'Query' },
  { value: 'url', label: 'URL / Page' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'clicks', label: 'Clicks' },
  { value: 'ctr', label: 'CTR' },
  { value: 'position', label: 'Position' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'users', label: 'Users' },
  { value: 'bounceRate', label: 'Bounce Rate' },
];

export const ColumnMapper: React.FC<ColumnMapperProps> = ({ jobId, onConfirmMapping, isProcessing }) => {
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<ColumnMapping[]>([]);

  useEffect(() => {
    if (!jobId) return;

    const unsub = onSnapshot(doc(db, 'importJobs', jobId), (docSnap) => {
      if (docSnap.exists()) {
        const jobData = docSnap.data() as ImportJob;
        setJob(jobData);
        if (jobData.status === 'validating' && jobData.detectedSchema) {
          setSchema(jobData.detectedSchema);
        }
        if (jobData.status === 'failed') {
          setError(jobData.error || 'The processing job failed.');
        }
      } else {
        setError('Job not found.');
      }
    }, (err) => {
      console.error("Error listening to job document:", err);
      setError('Error connecting to the database.');
    });

    return () => unsub();
  }, [jobId]);

  const handleMappingChange = (header: string, newTargetField: string | null) => {
    setSchema(currentSchema =>
      currentSchema.map(mapping =>
        mapping.header === header ? { ...mapping, targetField: newTargetField } : mapping
      )
    );
  };

  const handleSubmit = () => {
    onConfirmMapping(jobId, schema);
  };

  if (error) {
    return <div className="text-red-400 bg-red-900/50 p-4 rounded-lg">Error: {error}</div>;
  }

  if (!job || job.status === 'pending' || job.status === 'parsing') {
    return (
      <div className="text-center p-8 bg-gray-800/50 rounded-lg border border-gray-700">
        <Loader className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white">Parsing File...</h3>
        <p className="text-gray-400 mt-2">Detecting schema and preparing data for validation.</p>
      </div>
    );
  }

  if (job.status !== 'validating') {
    return (
      <div className="text-center p-8 bg-gray-800/50 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-white">Job Status: {job.status}</h3>
        <p className="text-gray-400 mt-2">The job is not currently in the validation step.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-2">Confirm Column Mapping</h2>
      <p className="text-gray-400 mb-6">We've automatically detected the columns from <span className="font-semibold text-cyan-400">{job.filename}</span>. Please review and confirm the mappings below.</p>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="p-3 font-semibold text-gray-300">File Header</th>
              <th className="p-3 font-semibold text-gray-300">Map to Field</th>
            </tr>
          </thead>
          <tbody>
            {schema.map(({ header, targetField, confidence }) => (
              <tr key={header} className="border-b border-gray-700">
                <td className="p-3 text-white font-mono">{header}</td>
                <td className="p-3">
                  <select
                    value={targetField || ''}
                    onChange={(e) => handleMappingChange(header, e.target.value || null)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">-- Ignore this column --</option>
                    {TARGET_SCHEMA_FIELDS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                   {confidence < 1.0 && confidence > 0 && (
                        <p className="text-xs text-amber-400 mt-1">Low confidence guess ({Math.round(confidence * 100)}%)</p>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isProcessing}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-md transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isProcessing ? <Loader className="w-5 h-5" /> : 'Confirm Mapping & Start Import'}
        </button>
      </div>
    </div>
  );
};
