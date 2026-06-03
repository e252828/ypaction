import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const MAX_CACHED_IMAGE_BYTES = 50 * 1024 * 1024;

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/svg+xml': '.svg',
  'image/avif': '.avif',
  'image/x-icon': '.ico',
  'image/tiff': '.tiff',
};

export interface CacheRemoteImageInput {
  url: string;
  cacheDir: string;
  fetchImage?: (url: string) => Promise<Response>;
}

export interface CacheRemoteImageResult {
  success: boolean;
  filePath?: string;
  mimeType?: string;
  error?: string;
}

function normalizeRemoteImageUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function getCacheBaseName(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 32);
}

function inferImageExtensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    return Object.values(IMAGE_EXTENSION_BY_MIME).includes(ext) ? ext : null;
  } catch {
    return null;
  }
}

function inferImageExtensionFromBytes(buffer: Buffer): string | null {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return '.png';
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return '.jpg';
  if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') return '.gif';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return '.webp';
  if (buffer.subarray(0, 4).equals(Buffer.from([0x00, 0x00, 0x00, 0x1c])) && buffer.subarray(4, 12).toString('ascii') === 'ftypavif') return '.avif';
  return null;
}

function normalizeImageMimeType(value: string | null): string | null {
  if (!value) return null;
  const mimeType = value.split(';')[0]?.trim().toLowerCase();
  return mimeType && mimeType.startsWith('image/') ? mimeType : null;
}

function findExistingCachedImage(cacheDir: string, baseName: string): string | null {
  for (const extension of Object.values(IMAGE_EXTENSION_BY_MIME)) {
    const candidate = path.join(cacheDir, `${baseName}${extension}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export async function cacheRemoteImage(input: CacheRemoteImageInput): Promise<CacheRemoteImageResult> {
  const url = normalizeRemoteImageUrl(input.url);
  if (!url) {
    return { success: false, error: 'Only HTTP image URLs can be cached' };
  }

  const cacheDir = path.resolve(input.cacheDir);
  const baseName = getCacheBaseName(url);
  await fs.promises.mkdir(cacheDir, { recursive: true });

  const existingPath = findExistingCachedImage(cacheDir, baseName);
  if (existingPath) {
    return { success: true, filePath: existingPath };
  }

  const fetchImage = input.fetchImage ?? fetch;
  const response = await fetchImage(url);
  if (!response.ok) {
    return { success: false, error: `Image download failed with HTTP ${response.status}` };
  }

  const mimeType = normalizeImageMimeType(response.headers.get('content-type'));
  if (!mimeType) {
    return { success: false, error: 'Downloaded content is not an image' };
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length <= 0) {
    return { success: false, error: 'Downloaded image is empty' };
  }
  if (buffer.length > MAX_CACHED_IMAGE_BYTES) {
    return { success: false, error: `Downloaded image is too large (max ${Math.floor(MAX_CACHED_IMAGE_BYTES / (1024 * 1024))}MB)` };
  }

  const extension =
    IMAGE_EXTENSION_BY_MIME[mimeType]
    ?? inferImageExtensionFromBytes(buffer)
    ?? inferImageExtensionFromUrl(url)
    ?? '.img';
  const filePath = path.join(cacheDir, `${baseName}${extension}`);
  await fs.promises.writeFile(filePath, buffer, { flag: 'wx' }).catch(async (error: NodeJS.ErrnoException) => {
    if (error.code !== 'EEXIST') throw error;
  });

  return { success: true, filePath, mimeType };
}
