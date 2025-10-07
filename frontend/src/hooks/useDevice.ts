'use client';

import { useEffect, useState } from 'react';

export const useDevice = () => {
  const [os, setOs] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    const userAgent = window.navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      setOs('ios');
    } else if (/Android/.test(userAgent)) {
      setOs('android');
    } else {
      setOs('other');
    }
  }, []);

  return os;
};