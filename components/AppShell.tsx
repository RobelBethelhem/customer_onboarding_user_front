import React from 'react';
import { Toaster } from 'sonner';

/**
 * Root element of every flow (individual, business, verification link, status page).
 * Interest-Free Banking products switch the brand colour to green (see index.html); sheets that
 * must cover the screen are portalled into #app-root.
 */
const AppShell: React.FC<{ ifb?: boolean; children: React.ReactNode }> = ({ ifb, children }) => (
  <div id="app-root" className="min-h-screen" data-theme={ifb ? 'ifb' : undefined}>
    <Toaster position="top-center" richColors />
    {children}
  </div>
);

export default AppShell;
