import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { i18nService } from '../../services/i18n';
import { getLocalFilePathFromImageSrc } from '../../utils/imageSource';
import { showToast } from '../../utils/localFileActions';

export interface ImagePreviewSource {
  src: string;
  alt?: string | null;
  title?: string | null;
  name?: string | null;
  filePath?: string | null;
}

interface ImagePreviewModalProps {
  image: ImagePreviewSource | null;
  onClose: () => void;
}

function getImageLabel(image: ImagePreviewSource): string {
  const label = image.name || image.title || image.alt;
  return label?.trim() || i18nService.t('artifactImageAlt');
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ image, onClose }) => {
  const mouseDownOnBackdropRef = useRef(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (!image) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [image, onClose]);

  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [contextMenu]);

  if (!image) return null;

  const label = getImageLabel(image);

  const resolveImageFilePath = async (): Promise<string | null> => {
    if (image.filePath) return image.filePath;
    const localPath = getLocalFilePathFromImageSrc(image.src);
    if (localPath) return localPath;
    if (/^https?:\/\//i.test(image.src)) {
      const result = await window.electron.imageCache.cacheRemoteImage(image.src);
      if (result.success && result.filePath) return result.filePath;
      console.warn('[ImagePreviewModal] remote image cache failed:', result.error);
    }
    return null;
  };

  const handleSave = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const filePath = await resolveImageFilePath();
      const result = filePath
        ? await window.electron.imageCache.saveImageFromFile(filePath)
        : /^data:image\//i.test(image.src)
          ? await window.electron.imageCache.saveImageFromDataUrl(image.src, image.name || image.title || image.alt || undefined)
          : { success: false, error: 'Image is not available locally' };
      if (!result.success) {
        showToast(result.error || i18nService.t('imageSaveFailed'));
      } else if (!result.canceled) {
        showToast(i18nService.t('fileSaved'));
      }
    } catch (error) {
      console.error('Failed to save image:', error);
      showToast(i18nService.t('imageSaveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (isCopying) return;
    setIsCopying(true);
    setContextMenu(null);
    try {
      const filePath = await resolveImageFilePath();
      const result = filePath
        ? await window.electron.clipboard.writeImageFromFile(filePath)
        : /^data:image\//i.test(image.src)
          ? await window.electron.clipboard.writeImageFromDataUrl(image.src)
          : { success: false, error: 'Image is not available locally' };
      if (result.success) {
        showToast(i18nService.t('imageCopied'));
      } else {
        showToast(result.error || i18nService.t('imageCopyFailed'));
      }
    } catch (error) {
      console.error('Failed to copy image:', error);
      showToast(i18nService.t('imageCopyFailed'));
    } finally {
      setIsCopying(false);
    }
  };

  const handleBackdropMouseDown: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    mouseDownOnBackdropRef.current = event.target === event.currentTarget;
  };

  const handleBackdropClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    if (event.target === event.currentTarget && mouseDownOnBackdropRef.current) {
      mouseDownOnBackdropRef.current = false;
      onClose();
    }
  };

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[10000] flex flex-col bg-neutral-950/70 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end p-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="pointer-events-auto mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-wait disabled:opacity-60"
          title={i18nService.t('saveToFile')}
          aria-label={i18nService.t('saveToFile')}
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="pointer-events-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          title={i18nService.t('close')}
          aria-label={i18nService.t('close')}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div
        className="flex min-h-0 flex-1 items-center justify-center px-5 py-16"
        onMouseDown={handleBackdropMouseDown}
        onClick={handleBackdropClick}
      >
        <div
          className="flex max-h-full max-w-full flex-col items-center gap-3"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="max-w-[min(90vw,720px)] truncate rounded-full bg-black/35 px-3 py-1 text-center text-xs font-medium text-white/85 ring-1 ring-white/10">
            {label}
          </div>
          <div className="flex max-h-full max-w-full items-center justify-center rounded-xl bg-white/95 p-1 shadow-2xl ring-1 ring-white/15">
            <img
              src={image.src}
              alt={image.alt ?? label}
              className="block max-h-[calc(100vh-11rem)] max-w-[calc(100vw-3.5rem)] object-contain rounded-lg"
              draggable={false}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setContextMenu({ x: event.clientX, y: event.clientY });
              }}
            />
          </div>
        </div>
      </div>
      {contextMenu && (
        <div
          className="fixed z-[10001] min-w-32 overflow-hidden rounded-lg bg-surface py-1 text-sm text-foreground shadow-xl ring-1 ring-border"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-surface-hover disabled:cursor-wait disabled:opacity-60"
            disabled={isCopying}
            onClick={handleCopy}
          >
            {i18nService.t('copyImage')}
          </button>
        </div>
      )}
    </div>
  );

  if (typeof document === 'undefined') {
    return modal;
  }

  return createPortal(modal, document.body);
};

export default ImagePreviewModal;
