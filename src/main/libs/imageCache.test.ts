import fs from 'fs';
import os from 'os';
import path from 'path';
import { expect, test } from 'vitest';

import { cacheRemoteImage } from './imageCache';

const pngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89,
]);

function makeResponse(buffer: Buffer, contentType: string): Response {
  return {
    ok: true,
    status: 200,
    headers: {
      get(name: string) {
        return name.toLowerCase() === 'content-type' ? contentType : null;
      },
    },
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  } as Response;
}

test('cacheRemoteImage stores a remote image under a stable local path', async () => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ypaction-image-cache-'));
  let fetchCount = 0;

  const first = await cacheRemoteImage({
    url: 'https://example.com/generated.png?temporary=1',
    cacheDir,
    fetchImage: async () => {
      fetchCount += 1;
      return makeResponse(pngBuffer, 'image/png');
    },
  });
  const second = await cacheRemoteImage({
    url: 'https://example.com/generated.png?temporary=1',
    cacheDir,
    fetchImage: async () => {
      fetchCount += 1;
      return makeResponse(Buffer.from('different'), 'image/png');
    },
  });

  expect(first.success).toBe(true);
  expect(second.success).toBe(true);
  expect(first.filePath).toBe(second.filePath);
  expect(fetchCount).toBe(1);
  expect(fs.readFileSync(first.filePath!)).toEqual(pngBuffer);
});

test('cacheRemoteImage rejects non-image responses without writing a file', async () => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ypaction-image-cache-'));

  const result = await cacheRemoteImage({
    url: 'https://example.com/not-image.txt',
    cacheDir,
    fetchImage: async () => makeResponse(Buffer.from('not an image'), 'text/plain'),
  });

  expect(result.success).toBe(false);
  expect(fs.readdirSync(cacheDir)).toHaveLength(0);
});
