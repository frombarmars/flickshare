'use client';

import { ENV_VARIABLES } from '@/constants/env_variables';
import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const Eruda = dynamic(() => import('./eruda-provider').then((c) => c.Eruda), {
  ssr: false,
});

export const ErudaProvider = (props: { children: ReactNode }) => {
  if (ENV_VARIABLES.APP_ENV === 'production') {
    return props.children;
  }
  return <Eruda>{props.children}</Eruda>;
};
