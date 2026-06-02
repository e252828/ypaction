import crypto from 'crypto';

import { AIHubAuth, AuthQuotaSource } from '../../shared/auth/constants';
import { ProviderRegistry } from '../../shared/providers';

export type AIHubRuntimeConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
};

export type AIHubTokenSet = {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  tokenType: string;
  expiresAt: number;
  scope?: string;
};

export type AIHubUserInfo = {
  sub: string;
  email: string;
  preferred_username: string;
  name: string;
  roles: string[];
  status?: number | string;
};

export type AIHubUserProfile = {
  provider: typeof AIHubAuth.Provider;
  openidIssuer: string;
  openidId: string;
  email: string;
  username: string;
  name: string;
  roles: string[];
  status?: number | string;
  yid: string;
  nickname: string;
  avatarUrl: null;
  userId: string;
};

export type AIHubQuota = {
  remaining?: number;
  used?: number;
  remainingAmount?: number;
  usedAmount?: number;
  monthRemainingQuota?: number | null;
  monthUsedTokens?: number;
  monthUsedQuota?: number;
  monthlyQuota?: number | null;
  monthlyQuotaUnlimited?: boolean;
  monthRemainingQuotaRaw?: number | null;
  monthUsedQuotaRaw?: number;
  monthlyQuotaRaw?: number | null;
  quotaCurrency?: string;
  quotaUnit?: string;
  periodStart?: number;
  periodEnd?: number;
};

export type NormalizedAIHubQuota = AIHubQuota & {
  source: typeof AuthQuotaSource.AIHub;
  planName: string;
  subscriptionStatus: string;
  creditsLimit: number;
  creditsUsed: number;
  creditsRemaining: number;
  hasPaidCredits: boolean;
  tokenCredits: number;
  usedQuota: number;
};

export type AIHubLLMTokenConfig = {
  id?: number;
  name?: string;
  apiKey: string;
  models: string[];
  group?: string;
  status?: number | string;
  unlimitedQuota?: boolean;
  remainingQuota?: number;
};

export type AIHubLLMConfig = {
  baseURL: string;
  apiKey: string;
  models: string[];
  tokens?: AIHubLLMTokenConfig[];
  quota?: AIHubQuota;
  group?: string;
  status?: number | string;
  product?: string;
  clientId?: string;
};

export type AIHubServerModel = {
  modelId: string;
  modelName: string;
  provider: string;
  apiFormat: 'openai';
  supportsImage: boolean;
  supportsThinking: boolean;
  contextWindow?: number;
  accessible: boolean;
};

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export function resolveAIHubIssuer(isTestMode: boolean): string {
  return isTestMode ? AIHubAuth.TestIssuer : AIHubAuth.Issuer;
}

export function resolveAIHubClientSecret(isTestMode: boolean): string {
  return isTestMode ? AIHubAuth.TestClientSecret : AIHubAuth.ClientSecret;
}

export function buildAIHubRuntimeConfig(isTestMode: boolean): AIHubRuntimeConfig {
  return {
    issuer: resolveAIHubIssuer(isTestMode),
    clientId: AIHubAuth.ClientId,
    clientSecret: resolveAIHubClientSecret(isTestMode),
    redirectUri: AIHubAuth.RedirectUri,
    scope: AIHubAuth.Scope,
  };
}

export function createAIHubState(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function buildAIHubAuthorizeUrl(config: AIHubRuntimeConfig, state: string): string {
  const url = new URL(`${config.issuer}/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', state);
  return url.toString();
}

export function validateAIHubCallbackState(expected: string | null, received: string | null): boolean {
  return !!expected && !!received && expected === received;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeAIHubUserInfo(raw: Record<string, unknown>, issuer: string): AIHubUserProfile {
  const openidId = readString(raw.sub);
  const username = readString(raw.preferred_username) || readString(raw.email) || openidId;
  const name = readString(raw.name) || username;
  const roles = Array.isArray(raw.roles)
    ? raw.roles.filter((role): role is string => typeof role === 'string')
    : [];
  return {
    provider: AIHubAuth.Provider,
    openidIssuer: issuer,
    openidId,
    email: readString(raw.email),
    username,
    name,
    roles,
    status: typeof raw.status === 'number' || typeof raw.status === 'string' ? raw.status : undefined,
    yid: `${issuer}:${openidId}`,
    nickname: name,
    avatarUrl: null,
    userId: openidId,
  };
}

export function normalizeAIHubQuota(raw: AIHubQuota | undefined): NormalizedAIHubQuota {
  const quota = raw ?? {};
  const monthlyQuota = typeof quota.monthlyQuota === 'number' ? quota.monthlyQuota : null;
  const monthUsedQuota = readNumber(quota.monthUsedQuota);
  const monthRemainingQuota = typeof quota.monthRemainingQuota === 'number'
    ? quota.monthRemainingQuota
    : monthlyQuota === null
      ? null
      : Math.max(0, monthlyQuota - monthUsedQuota);
  const unlimited = quota.monthlyQuotaUnlimited === true;
  const subscriptionStatus = unlimited || (monthlyQuota ?? 0) > 0 ? 'active' : 'free';
  const creditsLimit = unlimited ? 0 : (monthlyQuota ?? readNumber(quota.remainingAmount));
  const creditsRemaining = unlimited
    ? 0
    : (monthRemainingQuota ?? readNumber(quota.remainingAmount));

  return {
    ...quota,
    source: AuthQuotaSource.AIHub,
    planName: AIHubAuth.ModelProviderName,
    subscriptionStatus,
    creditsLimit,
    creditsUsed: monthUsedQuota,
    creditsRemaining,
    hasPaidCredits: subscriptionStatus === 'active' || readNumber(quota.remaining) > 0,
    tokenCredits: readNumber(quota.remaining),
    usedQuota: readNumber(quota.used),
    monthUsedTokens: readNumber(quota.monthUsedTokens),
    monthUsedQuota,
    monthlyQuota,
    monthlyQuotaUnlimited: unlimited,
    monthRemainingQuota,
    quotaCurrency: quota.quotaCurrency || 'USD',
    quotaUnit: quota.quotaUnit || quota.quotaCurrency || 'USD',
  };
}

function isEnabledStatus(status: unknown): boolean {
  if (status === undefined || status === null || status === '') {
    return true;
  }
  if (status === true || status === 1) {
    return true;
  }
  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    return normalized === 'enabled' || normalized === 'active' || normalized === '1';
  }
  return false;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function getAIHubAvailableModels(config: AIHubLLMConfig): string[] {
  if (!isEnabledStatus(config.status)) {
    return [];
  }
  if (Array.isArray(config.tokens) && config.tokens.length > 0) {
    return uniqueSorted(
      config.tokens
        .filter(token => isEnabledStatus(token.status))
        .flatMap(token => Array.isArray(token.models) ? token.models : []),
    );
  }
  return uniqueSorted(Array.isArray(config.models) ? config.models : []);
}

export function normalizeAIHubModels(config: AIHubLLMConfig): AIHubServerModel[] {
  return getAIHubAvailableModels(config).map(modelId => ({
    modelId,
    modelName: modelId,
    provider: AIHubAuth.ModelProviderName,
    apiFormat: 'openai',
    supportsImage: ProviderRegistry.getKnownModelSupportsImage(modelId) === true,
    supportsThinking: /(?:reason|thinking|deepseek-v4|qwq|qvq|o[134]|gpt-5)/i.test(modelId),
    contextWindow: ProviderRegistry.getKnownModelContextWindow(modelId),
    accessible: true,
  }));
}

export function selectAIHubTokenForModel(
  config: AIHubLLMConfig,
  modelId: string,
): { apiKey: string; baseURL: string } | null {
  const model = modelId.trim();
  if (!model) {
    return null;
  }
  if (!isEnabledStatus(config.status)) {
    return null;
  }
  if (Array.isArray(config.tokens) && config.tokens.length > 0) {
    const token = config.tokens.find(candidate =>
      isEnabledStatus(candidate.status)
      && Array.isArray(candidate.models)
      && candidate.models.includes(model)
      && readString(candidate.apiKey),
    );
    return token ? { apiKey: token.apiKey, baseURL: config.baseURL } : null;
  }
  if (Array.isArray(config.models) && config.models.includes(model) && readString(config.apiKey)) {
    return { apiKey: config.apiKey, baseURL: config.baseURL };
  }
  return null;
}

export function buildAIHubUpstreamUrl(baseURL: string, requestUrl: string | undefined): string {
  const normalizedBase = baseURL.trim().replace(/\/+$/, '');
  const pathName = (() => {
    try {
      return new URL(requestUrl || '/', 'http://127.0.0.1').pathname;
    } catch {
      return requestUrl || '/';
    }
  })();
  if (!pathName || pathName === '/') {
    return normalizedBase;
  }
  if (normalizedBase.endsWith('/v1') && pathName.startsWith('/v1/')) {
    return `${normalizedBase}${pathName.slice(3)}`;
  }
  if (normalizedBase.endsWith('/v1') && pathName === '/v1') {
    return normalizedBase;
  }
  return `${normalizedBase}${pathName.startsWith('/') ? pathName : `/${pathName}`}`;
}

function tokenSetFromResponse(raw: Record<string, unknown>): AIHubTokenSet {
  const accessToken = readString(raw.access_token);
  const refreshToken = readString(raw.refresh_token);
  if (!accessToken) {
    throw new Error('AIHub token response did not include an access token.');
  }
  const expiresIn = readNumber(raw.expires_in, 900);
  return {
    accessToken,
    refreshToken,
    idToken: readString(raw.id_token) || undefined,
    tokenType: readString(raw.token_type) || 'Bearer',
    expiresAt: Date.now() + expiresIn * 1000,
    scope: readString(raw.scope) || undefined,
  };
}

async function postAIHubToken(config: AIHubRuntimeConfig, body: URLSearchParams, fetchImpl: FetchLike): Promise<AIHubTokenSet> {
  if (!config.clientSecret) {
    throw new Error('AIHub client secret is not configured.');
  }
  body.set('client_id', config.clientId);
  body.set('client_secret', config.clientSecret);
  const response = await fetchImpl(`${config.issuer}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!response.ok) {
    throw new Error(`AIHub token request failed with HTTP ${response.status}.`);
  }
  return tokenSetFromResponse(await response.json() as Record<string, unknown>);
}

export function exchangeAIHubAuthCode(config: AIHubRuntimeConfig, code: string, fetchImpl: FetchLike): Promise<AIHubTokenSet> {
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', config.redirectUri);
  return postAIHubToken(config, body, fetchImpl);
}

export async function refreshAIHubToken(
  config: AIHubRuntimeConfig,
  refreshToken: string,
  fetchImpl: FetchLike,
): Promise<AIHubTokenSet> {
  const body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', refreshToken);
  const tokenSet = await postAIHubToken(config, body, fetchImpl);
  return {
    ...tokenSet,
    refreshToken: tokenSet.refreshToken || refreshToken,
  };
}

export async function fetchAIHubUserInfo(
  config: AIHubRuntimeConfig,
  accessToken: string,
  fetchImpl: FetchLike,
): Promise<AIHubUserProfile> {
  const response = await fetchImpl(`${config.issuer}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`AIHub userinfo request failed with HTTP ${response.status}.`);
  }
  return normalizeAIHubUserInfo(await response.json() as Record<string, unknown>, config.issuer);
}

export async function fetchAIHubLLMConfig(
  config: AIHubRuntimeConfig,
  accessToken: string,
  fetchImpl: FetchLike,
): Promise<AIHubLLMConfig> {
  const response = await fetchImpl(`${config.issuer}/llm-config`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`AIHub llm-config request failed with HTTP ${response.status}.`);
  }
  const body = await response.json() as AIHubLLMConfig;
  if (!readString(body.baseURL) || (!readString(body.apiKey) && (!Array.isArray(body.tokens) || body.tokens.length === 0))) {
    throw new Error('AIHub llm-config response is incomplete.');
  }
  return body;
}
