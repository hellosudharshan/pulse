/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { 
  Heart, 
  CheckCircle, 
  XSquare, 
  Activity, 
  Smile, 
  Eye, 
  Droplet, 
  TrendingUp, 
  ListRestart 
} from 'lucide-react';
import { ComplianceRecord, DailySummary } from '../types';

interface ComplianceStatsProps {
  records: ComplianceRecord[];
  onClearHistory: () => void;
}

export default function ComplianceStats({ records, onClearHistory }: ComplianceStatsProps) {
  
  // Calculate historical totals
  const stats = useMemo(() => {
    let completed = 0;
    let skipped = 0;
    
    // Category buckets
    const categories: Record<string, { completed: number; skipped: number }> = {
      eye: { completed: 0, skipped: 0 },
      stretch: { completed: 0, skipped: 0 },
      hydrate: { completed: 0, skipped: 0 },
      focus: { completed: 0, skipped: 0 },
      other: { completed: 0, skipped: 0 }
    };

    records.forEach(r => {
      if (r.status === 'completed') {
        completed++;
        if (categories[r.type]) categories[r.type].completed++;
      } else {
        skipped++;
        if (categories[r.type]) categories[r.type].skipped++;
      }
    });

    const total = completed + skipped;
    const score = total > 0 ? Math.round((completed / total) * 100) : 100;

    return {
      completed,
      skipped,
      total,
      score,
      categories
    };
  }, [records]);

  // Compile recent 5 logs
  const recentLogs = useMemo(() => {
    return [...records]
      .sort((a,b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [records]);

  // Aggregate past 7 days for the native SVG chart
  const weeklySummary = useMemo(() => {
    const list: Record<string, { date: string; completed: number; skipped: number }> = {};
    const daysArr: string[] = [];

    // Pre-populate last 5 days
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      list[dStr] = { date: label, completed: 0, skipped: 0 };
      daysArr.push(dStr);
    }

    records.forEach(r => {
      if (list[r.date]) {
        if (r.status === 'completed') {
          list[r.date].completed++;
        } else {
          list[r.date].skipped++;
        }
      }
    });

    return daysArr.map(dayKey => list[dayKey]);
  }, [records]);

  // SVG Chart sizing
  const chartHeight = 100;
  const chartWidth = 320;
  
  // Calculate maximum bar value to normalize heights
  const maxWeeklyVal = useMemo(() => {
    const vals = weeklySummary.map(w => w.completed + w.skipped);
    const max = Math.max(...vals);
    return max > 0 ? max : 5;
  }, [weeklySummary]);

  return (
    <div id="compliance-block" className="border border-gray-200 bg-white/95 p-6 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6 rounded-2xl">
      
      {/* 1. Score and overall Ratio Panel */}
      <div className="flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-200 pb-6 lg:pb-0 lg:pr-6">
        <div>
          <div className="flex items-center gap-1.5 mb-2 font-mono text-[9px] text-gray-400 uppercase font-bold tracking-wider">
            <Heart className="h-3.5 w-3.5 text-black" />
            WELLNESS COMPLIANCE SCORE
          </div>
          
          <div id="compliance-ratio-display" className="flex items-baseline gap-2">
            <span className="font-mono text-5xl md:text-6xl font-black text-black tracking-tighter">
              {stats.score}%
            </span>
            <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-[#9c9c9c]">Compliance</span>
          </div>

          <p className="font-sans text-xs text-gray-500 mt-2 leading-relaxed">
            Reflects how many micro-breaks, hydration sips, and focus blocks you completed against warnings skipped. Aim for &gt; 80% to protect focus.
          </p>
        </div>

        {/* Break Ratio Details */}
        <div className="mt-6 space-y-2 select-none">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">COMPLETED TASKS</span>
            <span id="completed-count" className="font-black text-emerald-600 text-sm">{stats.completed}</span>
          </div>
          
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">SKIPPED BREAKS</span>
            <span id="skipped-count" className="font-black text-red-500 text-sm">{stats.skipped}</span>
          </div>

          <div className="flex justify-between items-center text-xs font-mono border-t border-gray-100 pt-2">
            <span className="text-neutral-800 font-black uppercase tracking-wider text-[10px]">TOTAL EVALUATED</span>
            <span className="font-black text-sm">{stats.total}</span>
          </div>
        </div>

        {records.length > 0 && (
          <button
            onClick={onClearHistory}
            className="mt-4 inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-red-500 border-b border-dashed border-red-300 pb-0.5 hover:text-red-700 hover:border-red-500 transition-colors uppercase self-start font-bold cursor-pointer"
          >
            <ListRestart className="h-3 w-3" />
            Erase history logic
          </button>
        )}
      </div>

      {/* 2. Interactive SVG Analytics Trends */}
      <div className="flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-200 pb-6 lg:pb-0 lg:pr-6">
        <div>
          <div className="flex items-center gap-1.5 mb-4 font-mono text-[9px] text-gray-400 uppercase font-bold tracking-wider">
            <TrendingUp className="h-3.5 w-3.5 text-black" />
            5-DAY HISTORICAL TREND
          </div>

          {/* SVG representation for fully compliant charts */}
          <div id="svg-trend-chart-container" className="flex justify-center bg-neutral-50/50 border border-gray-200 p-3 my-2 rounded-xl">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto text-black">
              {/* Grid Lines */}
              <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#f1f1f1" strokeWidth="1" />
              <line x1="0" y1="50" x2={chartWidth} y2="50" stroke="#f1f1f1" strokeWidth="1" />
              <line x1="0" y1="80" x2={chartWidth} y2="80" stroke="#e5e5e5" strokeWidth="1" />

              {weeklySummary.map((day, idx) => {
                const total = day.completed + day.skipped;
                const compHeight = total > 0 ? (day.completed / maxWeeklyVal) * 60 : 0;
                const skipHeight = total > 0 ? (day.skipped / maxWeeklyVal) * 60 : 0;

                const colWidth = 25;
                const colGap = 65;
                const xPos = 25 + (idx * colGap);
                
                const compY = 80 - compHeight;
                const skipY = compY - skipHeight;

                return (
                  <g key={day.date} className="group">
                    {/* Completed Bar (Solid Green Tone or high contrast pattern) */}
                    {day.completed > 0 && (
                      <rect
                        x={xPos}
                        y={compY}
                        width={colWidth}
                        height={compHeight}
                        fill="#059669"
                        stroke="#000"
                        strokeWidth="1"
                      />
                    )}

                    {/* Skipped Bar (Solid Muted Gray/Stripes pattern) */}
                    {day.skipped > 0 && (
                      <rect
                        x={xPos}
                        y={skipY}
                        width={colWidth}
                        height={skipHeight}
                        fill="#ef4444"
                        stroke="#000"
                        strokeWidth="1"
                      />
                    )}

                    {/* Fallback empty circle dot when no records */}
                    {total === 0 && (
                      <circle cx={xPos + colWidth / 2} cy="80" r="2.5" fill="#a3a3a3" />
                    )}

                    {/* Day label text */}
                    <text
                      x={xPos + colWidth / 2}
                      y="94"
                      textAnchor="middle"
                      className="font-mono text-[9px] fill-gray-500 font-bold"
                    >
                      {day.date}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          
          <div className="flex items-center gap-4 justify-center mt-2 font-mono text-[9px] tracking-wider font-bold">
            <span className="flex items-center gap-1 text-gray-500">
              <span className="inline-block h-2 w-2 bg-emerald-600 border border-black" />
              COMPLETED
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <span className="inline-block h-2 w-2 bg-red-500 border border-black" />
              SKIPPED / MISSED
            </span>
          </div>
        </div>
      </div>

      {/* 3. Ergonomic Activity Log List */}
      <div className="flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-3 font-mono text-[9px] text-gray-400 uppercase font-bold tracking-wider">
            <Activity className="h-3.5 w-3.5 text-black" />
            WELLNESS TRANSACTION LOGS
          </div>

          <div id="logs-list-wrapper" className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {recentLogs.length === 0 ? (
              <p className="font-sans text-[11px] text-gray-400 italic text-center py-6">
                No recent transactions registered.
              </p>
            ) : (
              recentLogs.map((log) => {
                const timeLabel = new Date(log.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 border border-gray-200 bg-neutral-50/40 text-xs text-neutral-800 rounded-xl"
                  >
                    <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                      {log.status === 'completed' ? (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XSquare className="h-3.5 w-3.5 text-red-600 shrink-0" />
                      )}
                      
                      <div className="truncate">
                        <p className="font-sans font-bold leading-none truncate uppercase text-[11px] text-black tracking-tight">{log.label}</p>
                        <span className="font-mono text-[8px] text-gray-400 uppercase leading-none mt-1 inline-block">
                          {log.type} • {timeLabel}
                        </span>
                      </div>
                    </div>

                    <span className={`font-mono text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                      log.status === 'completed' 
                        ? 'bg-green-50 text-emerald-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
