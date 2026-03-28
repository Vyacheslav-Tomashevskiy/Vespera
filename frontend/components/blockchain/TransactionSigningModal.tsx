'use client';

import React, { useState } from 'react';
import { BaseModal } from '@/components/modals/BaseModal';
import { signChallengeXdr } from '@/lib/stellar-auth';
import { BlockchainStatusBadge } from '@/components/blockchain/BlockchainStatusBadge';
import { FileJson, Loader2 } from 'lucide-react';

export interface TransactionSigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Base64 XDR from your backend or Stellar SDK */
  transactionXdr: string;
  title?: string;
  subtitle?: string;
  /** Called with signed XDR from Freighter */
  onSigned?: (signedXdr: string) => void;
  onError?: (error: Error) => void;
}

export function TransactionSigningModal({
  isOpen,
  onClose,
  transactionXdr,
  title = 'Sign transaction',
  subtitle = 'Review and approve in Freighter',
  onSigned,
  onError,
}: TransactionSigningModalProps) {
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview =
    transactionXdr.length > 120
      ? `${transactionXdr.slice(0, 60)}…${transactionXdr.slice(-24)}`
      : transactionXdr;

  const handleSign = async () => {
    setError(null);
    setSigning(true);
    try {
      const signed = await signChallengeXdr(transactionXdr);
      onSigned?.(signed);
      onClose();
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Signing failed');
      setError(err.message);
      onError?.(err);
    } finally {
      setSigning(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={signing}
            className="px-4 py-2.5 rounded-xl text-slate-400 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSign()}
            disabled={signing || !transactionXdr}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
          >
            {signing ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Opening Freighter…
              </>
            ) : (
              'Sign in Freighter'
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <BlockchainStatusBadge variant="pending" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <FileJson size={14} />
            Transaction XDR (preview)
          </div>
          <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
            {preview || '—'}
          </pre>
        </div>
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Rejecting the prompt in Freighter will cancel this step. Ensure you
          are on the correct network in Freighter settings.
        </p>
      </div>
    </BaseModal>
  );
}
