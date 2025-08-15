import React, { useState, useCallback } from 'react';
import { DocumentArrowUpIcon } from './icons/DocumentArrowUpIcon';
import { Loader } from './Loader';

interface FileUploaderProps {
  onUploadSuccess: (jobId: string) => void;
  onUploadError: (error: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUploadSuccess, onUploadError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    onUploadError(''); // Clear previous errors
    setFileName(file.name);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'x-vercel-filename': file.name,
        },
        body: file,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'File upload failed.');
      }

      onUploadSuccess(result.jobId);
    } catch (error: any) {
      console.error('Upload error:', error);
      onUploadError(error.message || 'An unknown error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess, onUploadError]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form
        className={`p-8 border-2 border-dashed rounded-lg text-center transition-colors duration-300
                    ${dragActive ? 'border-cyan-500 bg-cyan-900/20' : 'border-gray-600 hover:border-cyan-600'}
                    ${isUploading ? 'cursor-not-allowed' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleChange}
          accept=".csv, .xlsx, .txt, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/plain"
          disabled={isUploading}
        />
        <label
          htmlFor="file-upload"
          className={`flex flex-col items-center justify-center h-full ${isUploading ? 'cursor-wait' : 'cursor-pointer'}`}
        >
          <DocumentArrowUpIcon className={`w-16 h-16 mb-4 transition-colors ${dragActive ? 'text-cyan-400' : 'text-gray-500'}`} />
          {isUploading ? (
            <>
              <h3 className="text-xl font-semibold text-white">Uploading...</h3>
              <p className="text-gray-400 mt-2">{fileName}</p>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                <div className="bg-cyan-600 h-2.5 rounded-full animate-pulse"></div>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-white">
                <span className="text-cyan-400 font-bold">Click to upload</span> or drag and drop
              </p>
              <p className="mt-1 text-sm text-gray-500">CSV, XLSX, or TXT files</p>
            </>
          )}
        </label>
      </form>
    </div>
  );
};
