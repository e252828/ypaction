export const ImageCacheIpc = {
  CacheRemoteImage: 'image-cache:cacheRemoteImage',
  SaveImageFromFile: 'image-cache:saveImageFromFile',
  SaveImageFromDataUrl: 'image-cache:saveImageFromDataUrl',
} as const;

export type ImageCacheIpc = typeof ImageCacheIpc[keyof typeof ImageCacheIpc];
