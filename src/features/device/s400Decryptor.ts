/* eslint-disable no-bitwise */
import { ecb } from '@noble/ciphers/aes.js';

export type S400Measurement = {
  weightKg: number;
  impedance: number | null;
  heartRate: number | null;
};

function xorBlock(left: Uint8Array, right: Uint8Array) {
  const result = new Uint8Array(16);
  for (let index = 0; index < 16; index += 1) {
    result[index] = left[index] ^ right[index];
  }
  return result;
}

function formatHexToBytes(hex: string) {
  const normalized = hex.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
  if (normalized.length % 2 !== 0) {
    return null;
  }

  const result = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    const byteValue = Number.parseInt(normalized.slice(index, index + 2), 16);
    if (!Number.isFinite(byteValue)) {
      return null;
    }
    result[index / 2] = byteValue;
  }

  return result;
}

function encodeLengthBigEndian(length: number, size: number) {
  const out = new Uint8Array(size);
  let value = length;
  for (let index = size - 1; index >= 0; index -= 1) {
    out[index] = value & 0xff;
    value = Math.floor(value / 256);
  }
  return out;
}

function ccmCtrKeystreamBlock(nonce: Uint8Array, counter: number, lSize: number, key: Uint8Array) {
  const block = new Uint8Array(16);
  block[0] = lSize - 1;
  block.set(nonce, 1);
  block.set(encodeLengthBigEndian(counter, lSize), 16 - lSize);
  return ecb(key).encrypt(block);
}

function cbcMac(blocks: Uint8Array[], key: Uint8Array) {
  let state = new Uint8Array(16);
  for (const block of blocks) {
    state = ecb(key).encrypt(xorBlock(state, block));
  }
  return state;
}

function padTo16(input: Uint8Array) {
  if (input.length % 16 === 0) {
    return input;
  }
  const padded = new Uint8Array(Math.ceil(input.length / 16) * 16);
  padded.set(input, 0);
  return padded;
}

function splitBlocks16(input: Uint8Array) {
  const blocks: Uint8Array[] = [];
  for (let index = 0; index < input.length; index += 16) {
    blocks.push(input.slice(index, index + 16));
  }
  return blocks;
}

function parseDecryptedMeasurement(decrypted: Uint8Array): S400Measurement | null {
  if (decrypted.length < 12) {
    return null;
  }

  const payload = decrypted.slice(3, 12);
  if (payload.length < 5) {
    return null;
  }

  const valueBytes = payload.slice(1, 5);
  const value = new DataView(valueBytes.buffer, valueBytes.byteOffset, 4).getUint32(0, true);

  const weightRaw = value & 0x7ff;
  const heartRateRaw = (value >> 11) & 0x7f;
  const impedanceRaw = value >>> 18;
  const weightKg = weightRaw / 10;

  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 300) {
    return null;
  }

  const heartRate = heartRateRaw >= 1 && heartRateRaw <= 126 ? heartRateRaw + 50 : null;
  const impedance = impedanceRaw !== 0 && weightRaw !== 0 ? impedanceRaw / 10 : null;

  return {
    weightKg,
    impedance,
    heartRate,
  };
}

function decryptCandidate(
  candidateData: Uint8Array,
  macAddress: string,
  bindKeyHex: string,
): S400Measurement | null {
  const key = formatHexToBytes(bindKeyHex);
  if (!key || key.length !== 16) {
    return null;
  }

  const macBytes = formatHexToBytes(macAddress.replace(/:/g, ''));
  if (!macBytes || macBytes.length !== 6) {
    return null;
  }

  if (candidateData.length !== 24 && candidateData.length !== 26) {
    return null;
  }

  const data = candidateData.length === 26 ? candidateData.slice(2) : candidateData;
  if (data.length !== 24) {
    return null;
  }

  const nonce = new Uint8Array(12);
  nonce.set(macBytes.slice().reverse(), 0);
  nonce.set(data.slice(2, 5), 6);
  nonce.set(data.slice(data.length - 7, data.length - 4), 9);

  const micEncrypted = data.slice(data.length - 4);
  const ciphertext = data.slice(5, data.length - 7);

  const tagSize = 4;
  const lSize = 3;

  const decrypted = new Uint8Array(ciphertext.length);
  let offset = 0;
  let counter = 1;
  while (offset < ciphertext.length) {
    const sBlock = ccmCtrKeystreamBlock(nonce, counter, lSize, key);
    const blockSize = Math.min(16, ciphertext.length - offset);
    for (let index = 0; index < blockSize; index += 1) {
      decrypted[offset + index] = ciphertext[offset + index] ^ sBlock[index];
    }
    offset += blockSize;
    counter += 1;
  }

  const s0 = ccmCtrKeystreamBlock(nonce, 0, lSize, key);
  const tag = new Uint8Array(tagSize);
  for (let index = 0; index < tagSize; index += 1) {
    tag[index] = micEncrypted[index] ^ s0[index];
  }

  const b0 = new Uint8Array(16);
  const hasAad = 1;
  const mPrime = (tagSize - 2) / 2;
  const lPrime = lSize - 1;
  b0[0] = hasAad * 64 + mPrime * 8 + lPrime;
  b0.set(nonce, 1);
  b0.set(encodeLengthBigEndian(decrypted.length, lSize), 16 - lSize);

  const aad = new Uint8Array([0x11]);
  const aadHeader = encodeLengthBigEndian(aad.length, 2);
  const aadBlock = padTo16(new Uint8Array([...aadHeader, ...aad]));
  const messageBlocks = splitBlocks16(padTo16(decrypted));
  const macBlocks = [b0, ...splitBlocks16(aadBlock), ...messageBlocks];

  const mac = cbcMac(macBlocks, key);
  for (let index = 0; index < tagSize; index += 1) {
    if (mac[index] !== tag[index]) {
      return null;
    }
  }

  return parseDecryptedMeasurement(decrypted);
}

export function decryptS400FromAdvertisement(
  packet: Uint8Array,
  macAddress: string,
  bindKeyHex: string,
) {
  const candidates: Uint8Array[] = [];
  if (packet.length >= 24) {
    for (let length of [26, 24]) {
      if (packet.length >= length) {
        for (let start = 0; start <= packet.length - length; start += 1) {
          candidates.push(packet.slice(start, start + length));
        }
      }
    }
  }

  for (const candidate of candidates) {
    const measurement = decryptCandidate(candidate, macAddress, bindKeyHex);
    if (measurement) {
      return measurement;
    }
  }

  return null;
}

export function isValidS400BindKey(bindKey: string) {
  return /^[0-9a-fA-F]{32}$/.test(bindKey.trim());
}
