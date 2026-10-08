import React from 'react';
import { InlineAlert } from '../../shared/components';
import { pendingForCurrentUser, syncPendingRecords, usePendingRecords } from './pendingRecords';

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** "N data belum terkirim" with a manual send action; hidden when nothing is queued. */
export function PendingSyncBanner() {
  const { records, isSyncing } = usePendingRecords();
  const pending = pendingForCurrentUser(records);
  if (pending.length === 0) {
    return null;
  }
  const rejected = pending.find(record => record.lastError);
  const message = isSyncing
    ? 'Sedang mengirim...'
    : rejected
      ? `Ditolak server: ${rejected.lastError}`
      : 'Tersimpan di HP ini dan dikirim otomatis saat ada koneksi. Jangan hapus aplikasi atau datanya sebelum terkirim.';

  return (
    <InlineAlert
      actionLabel={isSyncing ? undefined : 'Kirim sekarang'}
      message={message}
      onAction={isSyncing ? undefined : () => syncPendingRecords().catch(() => undefined)}
      title={`${pending.length} data belum terkirim`}
      tone="warning"
    />
  );
}

/** Shown when a list comes from the phone because the server was unreachable. */
export function OfflineDataBanner({
  cachedAt,
  onRetry,
}: {
  cachedAt: string | null;
  onRetry?: () => void;
}) {
  if (!cachedAt) {
    return null;
  }
  return (
    <InlineAlert
      actionLabel="Muat ulang"
      message={`Tidak ada koneksi. Menampilkan data tersimpan di HP (${formatTime(cachedAt)}). Pencatatan tetap bisa dilanjutkan.`}
      onAction={onRetry}
      title="Mode offline"
      tone="info"
    />
  );
}
