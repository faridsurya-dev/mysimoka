type AuthFlow = 'login' | 'register' | 'verify-email';

function containsOneOf(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword));
}

function toSentence(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return '';
  }

  const sentence = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

export function getFriendlyAuthErrorMessage(error: unknown, flow: AuthFlow): string {
  const fallbackMessage =
    flow === 'login'
      ? 'Login belum berhasil. Coba lagi dalam beberapa saat.'
      : 'Pendaftaran belum berhasil. Coba lagi dalam beberapa saat.';

  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const raw = error.message.trim();
  if (raw.length === 0) {
    return fallbackMessage;
  }

  const lower = raw.toLowerCase();

  if (
    containsOneOf(lower, [
      'network request failed',
      'failed to fetch',
      'network error',
      'internet',
      'timeout',
      'timed out',
      'socket',
      'unreachable',
    ])
  ) {
    return 'Koneksi internet sedang bermasalah. Cek jaringan lalu coba lagi.';
  }

  if (
    containsOneOf(lower, [
      'failed to check existing school',
      'failed to connect',
      'sqlstate',
      'password authentication failed',
      'internal server error',
      'database',
    ])
  ) {
    return 'Layanan pendaftaran sedang mengalami gangguan. Coba lagi dalam beberapa saat.';
  }

  if (
    flow === 'login' &&
    containsOneOf(lower, [
      'email atau password',
      'invalid credential',
      'invalid credentials',
      'wrong password',
      'unauthorized',
      '401',
      'akun tidak ditemukan',
      'user not found',
      'credential',
    ])
  ) {
    return 'Email atau password belum sesuai. Coba periksa kembali.';
  }

  if (
    flow === 'register' &&
    containsOneOf(lower, [
      'already',
      'sudah terdaftar',
      'has already been taken',
      'duplicate',
      '409',
    ])
  ) {
    return 'Email sudah terdaftar. Gunakan email lain atau login dengan akun yang ada.';
  }

  if (flow === 'register' && containsOneOf(lower, ['valid email address', 'must be a valid email'])) {
    return 'Format email belum valid. Contoh: nama@domain.com.';
  }

  if (
    flow === 'register' &&
    containsOneOf(lower, ['at least 8', 'at least 6 characters', 'minimal 8', 'min 8', 'min 6'])
  ) {
    return 'Password minimal 8 karakter.';
  }

  if (
    flow === 'login' &&
    containsOneOf(lower, ['email is not verified', 'belum terverifikasi'])
  ) {
    return 'Email belum diverifikasi. Cek token verifikasi terlebih dahulu.';
  }

  if (flow === 'register' && containsOneOf(lower, ['full_name', 'name is required'])) {
    return 'Nama lengkap wajib diisi.';
  }

  if (
    flow === 'verify-email' &&
    containsOneOf(lower, ['invalid or expired verification token', 'invalid verification token'])
  ) {
    return 'Token verifikasi tidak valid atau sudah kedaluwarsa.';
  }

  if (flow === 'register' && containsOneOf(lower, ['password is required'])) {
    return 'Password wajib diisi.';
  }

  if (
    containsOneOf(lower, [
      'required',
      'harus diisi',
      'format',
      'tidak valid',
      'validation',
      'must be',
      'min',
      'max',
    ])
  ) {
    return 'Data yang dimasukkan belum valid. Periksa kembali lalu coba lagi.';
  }

  return toSentence(raw);
}
