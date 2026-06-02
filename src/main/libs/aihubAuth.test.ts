import { describe, expect, test } from 'vitest';

import { AIHubAuth, AuthQuotaSource } from '../../shared/auth/constants';
import {
  type AIHubLLMConfig,
  type AIHubRuntimeConfig,
  buildAIHubAuthorizeUrl,
  buildAIHubRuntimeConfig,
  buildAIHubUpstreamUrl,
  exchangeAIHubAuthCode,
  fetchAIHubLLMConfig,
  getAIHubAvailableModels,
  normalizeAIHubModels,
  normalizeAIHubQuota,
  normalizeAIHubUserInfo,
  refreshAIHubToken,
  resolveAIHubClientSecret,
  resolveAIHubIssuer,
  selectAIHubTokenForModel,
  validateAIHubCallbackState,
} from './aihubAuth';

const runtimeConfig: AIHubRuntimeConfig = {
  issuer: 'https://aihub.example.com/api/client-oidc/ypaction',
  clientId: AIHubAuth.ClientId,
  clientSecret: 'secret',
  redirectUri: AIHubAuth.RedirectUri,
  scope: AIHubAuth.Scope,
};

const llmConfig: AIHubLLMConfig = {
  baseURL: 'https://aihub.example.com/v1',
  apiKey: 'top-key',
  models: ['fallback-model'],
  tokens: [
    {
      apiKey: 'enabled-key',
      models: ['qwen-plus', 'deepseek-v4'],
      status: 1,
    },
    {
      apiKey: 'disabled-key',
      models: ['disabled-model'],
      status: 0,
    },
  ],
  quota: {
    monthRemainingQuota: 12.34,
    monthUsedTokens: 5678,
    monthUsedQuota: 3.21,
    monthlyQuota: 20,
    monthlyQuotaUnlimited: false,
    quotaCurrency: 'CNY',
  },
  status: 1,
};

describe('aihubAuth', () => {
  test('resolves AIHub issuer and client secret from code constants', () => {
    expect(resolveAIHubIssuer(false)).toBe(AIHubAuth.Issuer);
    expect(resolveAIHubIssuer(true)).toBe(AIHubAuth.TestIssuer);
    expect(resolveAIHubClientSecret(false)).toBe(AIHubAuth.ClientSecret);
    expect(resolveAIHubClientSecret(true)).toBe(AIHubAuth.TestClientSecret);
    expect(buildAIHubRuntimeConfig(false)).toMatchObject({
      issuer: AIHubAuth.Issuer,
      clientId: AIHubAuth.ClientId,
      clientSecret: AIHubAuth.ClientSecret,
      redirectUri: AIHubAuth.RedirectUri,
      scope: AIHubAuth.Scope,
    });
  });

  test('builds an authorize URL with fixed ypaction OIDC parameters', () => {
    const url = new URL(buildAIHubAuthorizeUrl(runtimeConfig, 'state-123'));

    expect(url.origin + url.pathname).toBe(`${runtimeConfig.issuer}/authorize`);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('ypaction');
    expect(url.searchParams.get('redirect_uri')).toBe('ypaction://auth/callback');
    expect(url.searchParams.get('scope')).toBe('openid profile email offline_access');
    expect(url.searchParams.get('state')).toBe('state-123');
  });

  test('validates deep link state before exchanging code', () => {
    expect(validateAIHubCallbackState('expected', 'expected')).toBe(true);
    expect(validateAIHubCallbackState('expected', 'other')).toBe(false);
    expect(validateAIHubCallbackState(null, 'expected')).toBe(false);
    expect(validateAIHubCallbackState('expected', null)).toBe(false);
  });

  test('exchanges auth code using the AIHub token endpoint', async () => {
    let requestedUrl = '';
    let requestedBody = '';
    const tokenSet = await exchangeAIHubAuthCode(runtimeConfig, 'auth-code', async (url, init) => {
      requestedUrl = url;
      requestedBody = String(init?.body);
      return new Response(JSON.stringify({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        expires_in: 120,
        scope: AIHubAuth.Scope,
      }));
    });

    const body = new URLSearchParams(requestedBody);
    expect(requestedUrl).toBe(`${runtimeConfig.issuer}/token`);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('auth-code');
    expect(body.get('redirect_uri')).toBe(AIHubAuth.RedirectUri);
    expect(body.get('client_id')).toBe(AIHubAuth.ClientId);
    expect(body.get('client_secret')).toBe('secret');
    expect(tokenSet.accessToken).toBe('access-token');
    expect(tokenSet.refreshToken).toBe('refresh-token');
    expect(tokenSet.expiresAt).toBeGreaterThan(Date.now());
  });

  test('preserves rolling refresh token when refresh response omits a new one', async () => {
    const tokenSet = await refreshAIHubToken(runtimeConfig, 'existing-refresh', async () =>
      new Response(JSON.stringify({
        access_token: 'next-access',
        token_type: 'Bearer',
        expires_in: 60,
      })));

    expect(tokenSet.accessToken).toBe('next-access');
    expect(tokenSet.refreshToken).toBe('existing-refresh');
  });

  test('maps AIHub userinfo into local openid identity fields', () => {
    const user = normalizeAIHubUserInfo({
      sub: 'openid-1',
      email: 'user@example.com',
      preferred_username: 'ypuser',
      name: '悦普用户',
      roles: ['member'],
      status: 1,
    }, runtimeConfig.issuer);

    expect(user.provider).toBe(AIHubAuth.Provider);
    expect(user.openidIssuer).toBe(runtimeConfig.issuer);
    expect(user.openidId).toBe('openid-1');
    expect(user.yid).toBe(`${runtimeConfig.issuer}:openid-1`);
    expect(user.nickname).toBe('悦普用户');
  });

  test('normalizes AIHub quota amount fields for the account menu', () => {
    const quota = normalizeAIHubQuota(llmConfig.quota);

    expect(quota.source).toBe(AuthQuotaSource.AIHub);
    expect(quota.monthRemainingQuota).toBe(12.34);
    expect(quota.monthUsedTokens).toBe(5678);
    expect(quota.monthUsedQuota).toBe(3.21);
    expect(quota.monthlyQuota).toBe(20);
    expect(quota.monthlyQuotaUnlimited).toBe(false);
    expect(quota.quotaCurrency).toBe('CNY');
    expect(quota.subscriptionStatus).toBe('active');
  });

  test('converts enabled AIHub token models into Yuepu server models', () => {
    const models = normalizeAIHubModels(llmConfig);

    expect(models.map(model => model.modelId)).toEqual(['deepseek-v4', 'qwen-plus']);
    expect(models.every(model => model.provider === AIHubAuth.ModelProviderName)).toBe(true);
    expect(models.every(model => model.apiFormat === 'openai')).toBe(true);
    expect(models.find(model => model.modelId === 'deepseek-v4')?.supportsThinking).toBe(true);
  });

  test('selects the enabled token that grants access to the requested model', () => {
    expect(selectAIHubTokenForModel(llmConfig, 'qwen-plus')).toEqual({
      apiKey: 'enabled-key',
      baseURL: llmConfig.baseURL,
    });
  });

  test('falls back to the top-level key only when tokens are absent', () => {
    const selected = selectAIHubTokenForModel({
      ...llmConfig,
      tokens: undefined,
      models: ['fallback-model'],
    }, 'fallback-model');

    expect(selected).toEqual({
      apiKey: 'top-key',
      baseURL: llmConfig.baseURL,
    });
  });

  test('fails closed when llm-config is unavailable or incomplete', async () => {
    await expect(fetchAIHubLLMConfig(runtimeConfig, 'access-token', async () =>
      new Response('unavailable', { status: 503 })))
      .rejects.toThrow('HTTP 503');

    await expect(fetchAIHubLLMConfig(runtimeConfig, 'access-token', async () =>
      new Response(JSON.stringify({ baseURL: 'https://aihub.example.com/v1', models: ['qwen-plus'] }))))
      .rejects.toThrow('incomplete');
  });

  test('fails closed for disabled config, disabled token, and unauthorized model', () => {
    const disabledConfig = { ...llmConfig, status: 0 };

    expect(getAIHubAvailableModels(disabledConfig)).toEqual([]);
    expect(selectAIHubTokenForModel(disabledConfig, 'qwen-plus')).toBeNull();
    expect(selectAIHubTokenForModel(llmConfig, 'disabled-model')).toBeNull();
    expect(selectAIHubTokenForModel(llmConfig, 'missing-model')).toBeNull();
  });

  test('builds upstream URLs without duplicating v1 paths', () => {
    expect(buildAIHubUpstreamUrl('https://aihub.example.com/v1', '/v1/chat/completions'))
      .toBe('https://aihub.example.com/v1/chat/completions');
    expect(buildAIHubUpstreamUrl('https://aihub.example.com/openai', '/v1/models'))
      .toBe('https://aihub.example.com/openai/v1/models');
  });
});
