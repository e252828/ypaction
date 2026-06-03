import { expect, test } from 'vitest';

import { getLocalFilePathFromImageSrc, toLocalFileSrc } from './imageSource';

test('toLocalFileSrc encodes Windows drive separators so Chromium does not treat the drive as host', () => {
  expect(toLocalFileSrc('C:\\Users\\lemcon\\AppData\\Roaming\\YP Action\\image-cache\\chat-images\\a.png'))
    .toBe('localfile:///C%3A/Users/lemcon/AppData/Roaming/YP%20Action/image-cache/chat-images/a.png');
});

test('toLocalFileSrc preserves encoded Windows localfile drive URLs without double encoding', () => {
  expect(toLocalFileSrc('localfile:///C%3A/Users/lemcon/AppData/Roaming/YP%20Action/a.png'))
    .toBe('localfile:///C%3A/Users/lemcon/AppData/Roaming/YP%20Action/a.png');
});

test('toLocalFileSrc rewrites Windows drive hosts into encoded drive paths', () => {
  expect(toLocalFileSrc('localfile://C/Users/lemcon/AppData/Roaming/YP%20Action/a.png'))
    .toBe('localfile:///C%3A/Users/lemcon/AppData/Roaming/YP%20Action/a.png');
});

test('getLocalFilePathFromImageSrc decodes encoded Windows localfile URLs', () => {
  expect(getLocalFilePathFromImageSrc('localfile:///C%3A/Users/lemcon/AppData/Roaming/YP%20Action/a.png'))
    .toBe('C:\\Users\\lemcon\\AppData\\Roaming\\YP Action\\a.png');
});

test('getLocalFilePathFromImageSrc treats a Windows drive host as a drive letter', () => {
  expect(getLocalFilePathFromImageSrc('localfile://C/Users/lemcon/AppData/Roaming/YP%20Action/a.png'))
    .toBe('C:\\Users\\lemcon\\AppData\\Roaming\\YP Action\\a.png');
});
