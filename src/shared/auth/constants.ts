export const AIHubAuth = {
  Product: 'ypaction',
  ClientId: 'ypaction',
  ClientSecret: 'actionsecret',
  Scope: 'openid profile email offline_access',
  RedirectUri: 'ypaction://auth/callback',
  Issuer: 'https://oapi.eshypdata.com/api/client-oidc/ypaction',
  //TestIssuer: 'http://localhost:6001/api/client-oidc/ypaction',
  TestIssuer: 'https://oapi.eshypdata.com/api/client-oidc/ypaction',
  TestClientSecret: 'actionsecret',
  Provider: 'openid',
  ModelProviderName: '悦普',
  LlmConfigCacheTtlMs: 60_000,
} as const;

export const AIHubAuthStoreKey = {
  Tokens: 'aihub_auth_tokens',
  User: 'aihub_auth_user',
  State: 'aihub_auth_state',
} as const;

export const AuthQuotaSource = {
  AIHub: 'aihub',
} as const;
export type AuthQuotaSource = typeof AuthQuotaSource[keyof typeof AuthQuotaSource];
