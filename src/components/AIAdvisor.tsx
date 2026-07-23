import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, Lightbulb, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { AIInsightResponse, AppSettings } from '../types';

interface AIAdvisorProps {
  selectedMonth: string;
  settings: AppSettings;
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ selectedMonth, settings }) => {
  const [insights, setInsights] = useState<AIInsightResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getInsights(selectedMonth);
      setInsights(data);
    } catch (err: any) {
      console.error('Failed to load AI insights:', err);
      setError(err.message || 'Gemini API call failed. Verify your key in Settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [selectedMonth]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span>Gemini Household Financial AI Advisor</span>
            </h2>
            <p className="text-xs text-slate-500">
              Automated ledger analysis for {settings.partnerA.name} & {settings.partnerB.name}
            </p>
          </div>
        </div>

        <button
          onClick={loadInsights}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow-md shadow-amber-100 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Analyzing Ledger...' : 'Re-run Analysis'}</span>
        </button>
      </div>

      {isLoading && (
        <div className="py-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-800">Gemini AI is examining your household ledger...</p>
          <p className="text-xs text-slate-500">Detecting spending spikes, and savings opportunities</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-rose-700">
            <AlertTriangle className="w-4 h-4" />
            <span>Analysis Unavailable</span>
          </div>
          <p>{error}</p>
        </div>
      )}

      {insights && !isLoading && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="bg-amber-50/60 p-4 sm:p-5 rounded-2xl border border-amber-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">
              Executive Household Summary
            </h3>
            <p className="text-sm text-slate-800 leading-relaxed font-medium">{insights.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key Insights */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Key Spending Insights</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                {insights.keyInsights?.map((insight, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-indigo-600 font-bold">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actionable Savings Tips */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center space-x-2">
                <Lightbulb className="w-4 h-4" />
                <span>Tailored Savings Recommendations</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                {insights.savingTips?.map((tip, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Anomaly Alerts */}
          {insights.anomalies && insights.anomalies.length > 0 && (
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Spike & Anomaly Alerts</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-rose-900">
                {insights.anomalies.map((anom, idx) => (
                  <li key={idx}>• {anom}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
