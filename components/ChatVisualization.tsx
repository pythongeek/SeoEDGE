
import React from 'react';
import type { ChatVisualizationData } from '../types';

interface ChatVisualizationProps {
  visualization: ChatVisualizationData;
}

export const ChatVisualization: React.FC<ChatVisualizationProps> = ({ visualization }) => {
  if (visualization.type !== 'bar_chart') {
    return null; // Only support bar charts for now
  }

  const { title, data } = visualization;
  const maxValue = Math.max(...data.map(item => item.value), 0);
  const chartHeight = data.length * 40; // 40px per bar

  return (
    <div className="mt-2 p-4 bg-gray-900/50 rounded-lg border border-gray-600/50">
      <h4 className="text-sm font-semibold text-gray-200 mb-3">{title}</h4>
      <div className="space-y-2" style={{ height: `${chartHeight}px` }}>
        {data.map((item, index) => {
          const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={index} className="group flex items-center h-8">
              <div className="w-1/3 text-xs text-gray-400 truncate pr-2" title={item.label}>
                {item.label}
              </div>
              <div className="w-2/3 flex items-center">
                <div 
                  className="bg-cyan-500 h-4 rounded-r-sm transition-all duration-500"
                  style={{ width: `${barWidth}%` }}
                />
                <span className="text-xs font-mono text-cyan-200 ml-2">
                  {item.value.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
