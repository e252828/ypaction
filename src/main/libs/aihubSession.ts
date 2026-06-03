import {
  type AIHubLLMConfig,
  type AIHubRuntimeConfig,
  type AIHubTokenSet,
  type AIHubUserProfile,
  fetchAIHubLLMConfig,
  fetchAIHubUserInfo,
  type FetchLike,
  refreshAIHubToken,
} from './aihubAuth';

export interface RestoreAIHubSessionInput {
  config: AIHubRuntimeConfig;
  tokens: AIHubTokenSet | null;
  cachedUser: AIHubUserProfile | null;
  fetchImpl: FetchLike;
}

export interface RestoreAIHubSessionResult {
  success: boolean;
  tokens?: AIHubTokenSet;
  user?: AIHubUserProfile;
  llmConfig?: AIHubLLMConfig;
  isStale?: boolean;
  error?: string;
}

async function fetchSnapshot(
  config: AIHubRuntimeConfig,
  tokens: AIHubTokenSet,
  fetchImpl: FetchLike,
): Promise<RestoreAIHubSessionResult> {
  const user = await fetchAIHubUserInfo(config, tokens.accessToken, fetchImpl);
  const llmConfig = await fetchAIHubLLMConfig(config, tokens.accessToken, fetchImpl);
  return {
    success: true,
    tokens,
    user,
    llmConfig,
  };
}

export async function restoreAIHubSession(input: RestoreAIHubSessionInput): Promise<RestoreAIHubSessionResult> {
  const { config, tokens, cachedUser, fetchImpl } = input;
  if (!tokens?.accessToken) {
    return { success: false, error: 'No auth tokens' };
  }

  let firstError: unknown;
  try {
    return await fetchSnapshot(config, tokens, fetchImpl);
  } catch (error) {
    firstError = error;
  }

  if (tokens.refreshToken) {
    try {
      const refreshedTokens = await refreshAIHubToken(config, tokens.refreshToken, fetchImpl);
      return await fetchSnapshot(config, refreshedTokens, fetchImpl);
    } catch (error) {
      firstError = error;
    }
  }

  if (cachedUser) {
    return {
      success: true,
      tokens,
      user: cachedUser,
      isStale: true,
      error: firstError instanceof Error ? firstError.message : 'Failed to refresh auth state',
    };
  }

  return {
    success: false,
    error: firstError instanceof Error ? firstError.message : 'Failed to refresh auth state',
  };
}
