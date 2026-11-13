'use client';

import dynamic from 'next/dynamic';

// WebGL + canvas painting only make sense in the browser.
const Experience = dynamic(() => import('./Experience'), { ssr: false });

export default function ClientApp() {
  return <Experience />;
}
