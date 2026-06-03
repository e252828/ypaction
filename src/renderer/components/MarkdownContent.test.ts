import { expect, test } from 'vitest';

import {
  getLargeMarkdownPreview,
  isInternalHref,
  resolveCachedImageDisplaySrc,
  safeUrlTransform,
  shouldUseLargeMarkdownPreview,
} from './MarkdownContent';

test('large markdown preview threshold only applies to oversized content', () => {
  expect(shouldUseLargeMarkdownPreview('x'.repeat(8 * 1024))).toBe(false);
  expect(shouldUseLargeMarkdownPreview('x'.repeat(8 * 1024 + 1))).toBe(true);
});

test('large markdown preview keeps the head and latest tail', () => {
  const content = `head-${'x'.repeat(8 * 1024)}-middle-${'y'.repeat(8 * 1024)}-tail`;
  const preview = getLargeMarkdownPreview(content);

  expect(preview.startsWith('head-')).toBe(true);
  expect(preview).toContain('\n...\n');
  expect(preview.endsWith('-tail')).toBe(true);
  expect(preview.length).toBeLessThan(content.length);
});

test('kit links are treated as safe internal links', () => {
  expect(safeUrlTransform('kit://design@ypaction-kits')).toBe('kit://design@ypaction-kits');
  expect(isInternalHref('kit://design@ypaction-kits')).toBe(true);
});

test('unsafe markdown protocols are still stripped', () => {
  expect(safeUrlTransform('javascript:alert(1)')).toBe('');
});

test('cached images use data URLs from the local cache when available', async () => {
  const src = await resolveCachedImageDisplaySrc(
    'C:\\Users\\lemcon\\AppData\\Roaming\\YP Action\\image-cache\\chat-images\\a.png',
    async () => ({ success: true, dataUrl: 'data:image/png;base64,abc' }),
  );

  expect(src).toBe('data:image/png;base64,abc');
});

test('cached images fall back to localfile URLs when data URL reading fails', async () => {
  const src = await resolveCachedImageDisplaySrc(
    'C:\\Users\\lemcon\\AppData\\Roaming\\YP Action\\image-cache\\chat-images\\a.png',
    async () => ({ success: false, error: 'read failed' }),
  );

  expect(src).toBe('localfile:///C%3A/Users/lemcon/AppData/Roaming/YP%20Action/image-cache/chat-images/a.png');
});
