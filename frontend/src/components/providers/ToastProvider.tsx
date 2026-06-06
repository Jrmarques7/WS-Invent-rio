'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: { borderRadius: '8px', fontSize: '14px' },
        success: { style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } },
        error: { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } },
      }}
    />
  );
}
