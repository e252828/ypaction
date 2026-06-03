import { expect, test } from 'vitest';

import { AIHubAuth } from '../../shared/auth/constants';
import type { AIHubRuntimeConfig, AIHubTokenSet, AIHubUserProfile } from './aihubAuth';
import { restoreAIHubSession } from './aihubSession';

const runtimeConfig: AIHubRuntimeConfig = {
  issuer: 'https://aihub.example.com/api/client-oidc/ypaction',
  clientId: AIHubAuth.ClientId,
  clientSecret: 'secret',
  redirectUri: AIHubAuth.RedirectUri,
  scope: AIHubAuth.Scope,
};

const expiredTokens: AIHubTokenSet = {
  accessToken: 'expired-access',
  refreshToken: 'refresh-token',
  tokenType: 'Bearer',
  expiresAt: Date.now() - 1_000,
};

const cachedUser: AIHubUserProfile = {
  provider: AIHubAuth.Provider,
  openidIssuer: runtimeConfig.issuer,
  openidId: 'openid-1',
  email: 'user@example.com',
  username: 'user',
  name: 'User',
  roles: [],
  yid: `${runtimeConfig.issuer}:openid-1`,
  nickname: 'User',
  avatarUrl: null,
  userId: 'openid-1',
};

const llmConfig = {
  baseURL: 'https://aihub.example.com/v1',
  apiKey: 'api-key',
  models: ['qwen-plus'],
  status: 1,
};

test('restoreAIHubSession refreshes expired access tokens before returning a snapshot', async () => {
  const requestedAuthHeaders: string[] = [];
  const snapshot = await restoreAIHubSession({
    config: runtimeConfig,
    tokens: expiredTokens,
    cachedUser: null,
    fetchImpl: async (url, init) => {
      if (url.endsWith('/token')) {
        return new Response(JSON.stringify({
          access_token: 'fresh-access',
          refresh_token: 'fresh-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        }));
      }
      requestedAuthHeaders.push(String((init?.headers as Record<string, string>)?.Authorization));
      if (url.endsWith('/userinfo') && requestedAuthHeaders.length === 1) {
        return new Response('expired', { status: 401 });
      }
      if (url.endsWith('/userinfo')) {
        return new Response(JSON.stringify({
          sub: 'openid-1',
          email: 'user@example.com',
          preferred_username: 'user',
          name: 'User',
          roles: [],
        }));
      }
      return new Response(JSON.stringify(llmConfig));
    },
  });

  expect(snapshot.success).toBe(true);
  expect(snapshot.tokens?.accessToken).toBe('fresh-access');
  expect(snapshot.tokens?.refreshToken).toBe('fresh-refresh');
  expect(snapshot.user?.openidId).toBe('openid-1');
  expect(snapshot.llmConfig?.models).toEqual(['qwen-plus']);
  expect(requestedAuthHeaders).toEqual([
    'Bearer expired-access',
    'Bearer fresh-access',
    'Bearer fresh-access',
  ]);
});

test('restoreAIHubSession keeps cached login state when network restore fails', async () => {
  const snapshot = await restoreAIHubSession({
    config: runtimeConfig,
    tokens: expiredTokens,
    cachedUser,
    fetchImpl: async () => new Response('unavailable', { status: 503 }),
  });

  expect(snapshot.success).toBe(true);
  expect(snapshot.isStale).toBe(true);
  expect(snapshot.user).toBe(cachedUser);
  expect(snapshot.tokens).toBe(expiredTokens);
});
