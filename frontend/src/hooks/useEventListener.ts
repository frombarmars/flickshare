'use client';

import { useState, useCallback } from 'react';

interface EventListenerStatus {
  isRunning: boolean;
  loading: boolean;
  error: string | null;
}

export const useEventListener = () => {
  const [status, setStatus] = useState<EventListenerStatus>({
    isRunning: false,
    loading: false,
    error: null
  });

  const checkStatus = useCallback(async () => {
    setStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/contract-events');
      const data = await response.json();
      
      if (data.success) {
        setStatus(prev => ({ ...prev, isRunning: data.isRunning, loading: false }));
      } else {
        setStatus(prev => ({ ...prev, error: data.error || 'Failed to check status', loading: false }));
      }
    } catch (error) {
      setStatus(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      }));
    }
  }, []);

  const startListener = useCallback(async () => {
    setStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/contract-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(prev => ({ ...prev, isRunning: data.isRunning, loading: false }));
      } else {
        setStatus(prev => ({ ...prev, error: data.error || 'Failed to start listener', loading: false }));
      }
    } catch (error) {
      setStatus(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      }));
    }
  }, []);

  const stopListener = useCallback(async () => {
    setStatus(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/contract-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(prev => ({ ...prev, isRunning: data.isRunning, loading: false }));
      } else {
        setStatus(prev => ({ ...prev, error: data.error || 'Failed to stop listener', loading: false }));
      }
    } catch (error) {
      setStatus(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      }));
    }
  }, []);

  return {
    status,
    checkStatus,
    startListener,
    stopListener
  };
};