// Byte helpers shared by the BLE parsers (ble-plx exchanges values as base64).

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(base64Value: string) {
  // Hermes ships a native atob; fall back to the JS decoder elsewhere.
  const nativeAtob = (globalThis as { atob?: (value: string) => string }).atob;
  if (nativeAtob) {
    try {
      const binary = nativeAtob(base64Value);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch {
      throw new Error('Invalid base64 payload.');
    }
  }

  const normalized = base64Value.replace(/[^A-Za-z0-9+/=]/g, '');
  const output: number[] = [];
  let index = 0;

  while (index < normalized.length) {
    const char1 = normalized[index] ?? '=';
    const char2 = normalized[index + 1] ?? '=';
    const char3 = normalized[index + 2] ?? '=';
    const char4 = normalized[index + 3] ?? '=';

    const enc1 = BASE64_ALPHABET.indexOf(char1);
    const enc2 = BASE64_ALPHABET.indexOf(char2);
    const enc3 = char3 === '=' ? -1 : BASE64_ALPHABET.indexOf(char3);
    const enc4 = char4 === '=' ? -1 : BASE64_ALPHABET.indexOf(char4);

    if (enc1 < 0 || enc2 < 0 || (enc3 < 0 && char3 !== '=') || (enc4 < 0 && char4 !== '=')) {
      throw new Error('Invalid base64 payload.');
    }

    output.push(enc1 * 4 + Math.floor(enc2 / 16));
    if (enc3 >= 0) {
      output.push((enc2 % 16) * 16 + Math.floor(enc3 / 4));
    }
    if (enc4 >= 0 && enc3 >= 0) {
      output.push((enc3 % 4) * 64 + enc4);
    }

    index += 4;
  }

  return Uint8Array.from(output);
}

export function bytesToBase64(bytes: Uint8Array) {
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : -1;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : -1;
    output += BASE64_ALPHABET[Math.floor(b1 / 4)];
    output += BASE64_ALPHABET[(b1 % 4) * 16 + (b2 < 0 ? 0 : Math.floor(b2 / 16))];
    output += b2 < 0 ? '=' : BASE64_ALPHABET[(b2 % 16) * 4 + (b3 < 0 ? 0 : Math.floor(b3 / 64))];
    output += b3 < 0 ? '=' : BASE64_ALPHABET[b3 % 64];
  }
  return output;
}

export function bytesToHex(bytes: Uint8Array) {
  let result = '';
  for (const byte of bytes) {
    result += byte.toString(16).padStart(2, '0');
  }
  return result;
}

export function hexToBytes(hex: string) {
  const normalized = hex.replace(/[^0-9a-fA-F]/g, '');
  if (normalized.length % 2 !== 0) {
    throw new Error('Invalid hex payload.');
  }
  const result = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    result[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
  }
  return result;
}

export function readUInt16LE(bytes: Uint8Array, offset: number) {
  return bytes[offset] + bytes[offset + 1] * 256;
}
