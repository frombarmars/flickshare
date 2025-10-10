'use client';

import { useEffect } from 'react';
import { useEventListener } from '@/hooks/useEventListener';
import { Play, Square, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export const EventListenerAdmin = () => {
  const { status, checkStatus, startListener, stopListener } = useEventListener();

  useEffect(() => {
    // Check status on component mount
    checkStatus();
  }, [checkStatus]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Contract Event Listener</h3>
        <button
          onClick={checkStatus}
          disabled={status.loading}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${status.loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Display */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          {status.isRunning ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700 font-medium">Running</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700 font-medium">Stopped</span>
            </>
          )}
        </div>
        
        <div className={`w-3 h-3 rounded-full ${
          status.isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`} />
      </div>

      {/* Error Display */}
      {status.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-700 text-sm font-medium">Error:</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{status.error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={startListener}
          disabled={status.loading || status.isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          Start Listener
        </button>
        
        <button
          onClick={stopListener}
          disabled={status.loading || !status.isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Square className="w-4 h-4" />
          Stop Listener
        </button>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-700 text-sm">
          <strong>What this does:</strong> Listens to smart contract events and automatically 
          updates the database when reviews are created, supported, or liked on-chain.
        </p>
      </div>
    </div>
  );
};