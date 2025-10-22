'use client';
import { walletAuth } from '@/auth/wallet';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { MiniKit } from '@worldcoin/minikit-js';
import { useCallback, useState, useEffect } from 'react';

export const AuthButton = () => {
  const [isPending, setIsPending] = useState(false);
  const { isInstalled } = useMiniKit();
  const [isReady, setIsReady] = useState(false);

  // Check MiniKit readiness
  useEffect(() => {
    const checkMiniKit = () => {
      const ready = isInstalled || MiniKit.isInstalled();
      setIsReady(ready);
      console.log('🔍 AuthButton - MiniKit ready:', ready);
      console.log('🔍 AuthButton - isInstalled:', isInstalled);
      console.log('🔍 AuthButton - isPending:', isPending);
    };

    checkMiniKit();

    // Re-check after a short delay in case initialization is in progress
    const timer = setTimeout(checkMiniKit, 500);
    return () => clearTimeout(timer);
  }, [isInstalled, isPending]);

  const onClick = useCallback(async () => {
    console.log('🔘 Button clicked!');
    console.log('🔍 isInstalled:', isInstalled);
    console.log('🔍 isReady:', isReady);
    console.log('🔍 isPending:', isPending);

    if (!isReady && !isInstalled) {
      console.warn('⚠️ MiniKit not ready yet');
      alert('Please wait, app is initializing...');
      return;
    }

    if (isPending) {
      console.warn('⚠️ Already pending');
      return;
    }

    const code = localStorage.getItem('inviteCode') || '';
    console.log('🎫 Invite code:', code || 'none');

    setIsPending(true);
    try {
      console.log('🔐 Starting wallet auth...');
      await walletAuth(code);
      console.log('✅ Wallet auth completed');
    } catch (error) {
      console.error('❌ Wallet authentication error:', error);
    } finally {
      setIsPending(false);
      console.log('🏁 Auth flow finished');
    }
  }, [isInstalled, isReady, isPending]); // ✅ all dependencies


  return (
    <LiveFeedback
      label={{
        failed: 'Failed to login',
        pending: 'Logging in',
        success: 'Logged in',
      }}
      state={isPending ? 'pending' : undefined}
    >
      <Button
        onClick={onClick}
        disabled={isPending || (!isInstalled && !isReady)}
        size="lg"
        variant="primary"
        style={{ 
          cursor: (isPending || (!isInstalled && !isReady)) ? 'not-allowed' : 'pointer',
          pointerEvents: 'auto',
          position: 'relative',
          zIndex: 10
        }}
      >
        {isPending ? 'Logging in...' : (!isInstalled && !isReady) ? 'Initializing...' : 'Login with Wallet'}
      </Button>
    </LiveFeedback>
  );
};
