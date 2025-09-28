'use client';

import { useDevice } from '@/hooks/useDevice';
import { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

// This component is a footer component to help with design consistency for android and iOS devices
// Feel free to modify this component to fit your needs 

export const Footer = (props: { children: ReactNode; className?: string }) => {
  const os = useDevice();
  return (
    <footer className={twMerge('', clsx(props.className, os === 'ios' ? 'pb-5' : ''))}>
      {props.children}
    </footer>
  );
};
