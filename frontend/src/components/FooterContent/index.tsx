'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from '../Navigation';

export default function FooterContent() {
  const pathname = usePathname();

  // Hide the bottom nav on the /verify page
  if (pathname === '/verify') return null;

  return <Navigation />;
}