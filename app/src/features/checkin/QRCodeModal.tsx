'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Copy, Check, ExternalLink, Smartphone } from 'lucide-react';

interface QRCodeModalProps {
  sessionId: string;
  onClose: () => void;
}

export function QRCodeModal({ sessionId, onClose }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const checkInUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/sessions/${sessionId}/check-in`
      : `/sessions/${sessionId}/check-in`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    QRCode.toDataURL(checkInUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0d1117',
        light: '#ffffff',
      },
    })
      .then((dataUri) => {
        if (!cancelled) setQrDataUrl(dataUri);
      })
      .catch((err) => console.error('Failed to generate QR code:', err));

    return () => {
      cancelled = true;
    };
  }, [checkInUrl]);

  const copyUrl = () => {
    if (navigator?.clipboard?.writeText && checkInUrl) {
      navigator.clipboard.writeText(checkInUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card-surface border border-card-border p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-card-border">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-volt/10 text-volt border border-volt/20">
              <QrCode className="w-5 h-5" />
            </span>
            <div className="text-left">
              <h2 className="text-lg font-bold text-white tracking-tight">QR Self Check-In</h2>
              <p className="text-xs text-text-secondary">Scan to track &quot;Am I Next?&quot;</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-obsidian-dark hover:bg-card-border text-text-secondary hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="mt-6 p-4 rounded-2xl bg-white border-4 border-volt/80 shadow-lg">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="QR Code for Player Check-in"
              className="w-64 h-64 rounded-lg block"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-obsidian-dark font-mono text-sm">
              Generating QR...
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-5 space-y-1.5 text-xs text-text-secondary">
          <p className="text-white font-semibold flex items-center justify-center gap-1.5 text-sm">
            <Smartphone className="w-4 h-4 text-cyan" /> Scan with any phone camera
          </p>
          <p>
            Players can check their live queue spot, court calls, and wait times over local Wi-Fi without crowding the kiosk.
          </p>
        </div>

        {/* Direct Link / Copy */}
        <div className="mt-5 w-full flex items-center gap-2 p-2 rounded-xl bg-obsidian-dark border border-card-border">
          <span className="flex-1 text-[11px] font-mono text-text-secondary truncate text-left px-2">
            {checkInUrl}
          </span>
          <button
            type="button"
            onClick={copyUrl}
            className="px-3 py-1.5 rounded-lg bg-card-surface hover:bg-card-border text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy
              </>
            )}
          </button>
          <a
            href={checkInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-card-surface hover:bg-card-border text-text-secondary hover:text-white transition-colors shrink-0"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
