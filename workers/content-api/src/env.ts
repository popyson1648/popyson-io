export type RuntimeEnv = Omit<
  Env,
  | "AUTH_MODE"
  | "ACCESS_TEAM_DOMAIN"
  | "AUTHOR_POLICY_AUD"
  | "CI_POLICY_AUD"
  | "AUTHOR_SERVICE_TOKEN_ID"
  | "CI_SERVICE_TOKEN_ID"
  | "MAX_JSON_BYTES"
  | "MAX_ASSET_BYTES"
> & {
  AUTH_MODE: string;
  ACCESS_TEAM_DOMAIN: string;
  AUTHOR_POLICY_AUD: string;
  CI_POLICY_AUD: string;
  AUTHOR_SERVICE_TOKEN_ID: string;
  CI_SERVICE_TOKEN_ID: string;
  MAX_JSON_BYTES: string;
  MAX_ASSET_BYTES: string;
};
