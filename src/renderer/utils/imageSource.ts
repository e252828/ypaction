function stripHashAndQuery(value: string): string {
  const hashIndex = value.indexOf('#');
  const queryIndex = value.indexOf('?');
  const indexes = [hashIndex, queryIndex].filter(index => index >= 0);
  if (indexes.length === 0) return value;
  return value.slice(0, Math.min(...indexes));
}

function stripFileProtocol(value: string): string {
  return value.replace(/^(?:file|localfile):\/\//i, '');
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeLocalPathInput(value: string): string {
  const trimmed = stripHashAndQuery(value.trim());
  if (!/^(?:file|localfile):\/\//i.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const pathname = safeDecodeURIComponent(url.pathname);
    if (/^[A-Za-z]$/.test(url.host)) {
      return `${url.host.toUpperCase()}:${pathname.replace(/\//g, '\\')}`;
    }
    if (/^\/[A-Za-z]:\//.test(pathname)) {
      return pathname.slice(1);
    }
  } catch {
    // Fall back to the simple protocol strip below.
  }

  return safeDecodeURIComponent(stripFileProtocol(trimmed));
}

function encodeLocalPathForUrl(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')
    .split('/')
    .map((segment, index) => {
      if (index === 0 && segment === '') return '';
      return encodeURIComponent(segment);
    })
    .join('/');
}

export function toLocalFileSrc(filePath: string): string {
  const normalized = normalizeLocalPathInput(filePath);
  const encoded = encodeLocalPathForUrl(normalized);
  if (/^[A-Za-z]:/.test(normalized)) {
    return `localfile:///${encoded}`;
  }
  if (encoded.startsWith('/')) {
    return `localfile://${encoded}`;
  }
  return `localfile:///${encoded}`;
}

export function getLocalFilePathFromImageSrc(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed) return null;

  if (/^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.startsWith('\\\\')) {
    return trimmed;
  }

  if (!/^(?:file|localfile):\/\//i.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    let pathname = decodeURIComponent(url.pathname);
    if (/^[A-Za-z]$/.test(url.host)) {
      return `${url.host.toUpperCase()}:${pathname.replace(/\//g, '\\')}`;
    }
    if (/^\/[A-Za-z]:\//.test(pathname)) {
      pathname = pathname.slice(1);
    }
    return pathname.replace(/\//g, '\\');
  } catch {
    const withoutProtocol = trimmed.replace(/^(?:file|localfile):\/\//i, '');
    const decoded = decodeURIComponent(withoutProtocol.replace(/^\/([A-Za-z]:)/, '$1'));
    return decoded.replace(/\//g, '\\');
  }
}

export function getBase64FromDataUrl(dataUrl: string): { base64: string; mimeType: string } | null {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}
