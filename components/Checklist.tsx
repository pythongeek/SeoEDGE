
import React from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface ChecklistProps {
  items: string[];
}

export const Checklist: React.FC<ChecklistProps> = ({ items }) => {
  return (
    <div className="bg-gray-800/70 p-4 rounded-lg h-full">
      <h4 className="text-md font-semibold text-cyan-300 mb-2">Actionable SEO Checklist</h4>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start text-sm">
            <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-px" />
            <span className="text-gray-300">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
