export const KEY_ALGORITHM = "aes-256-gcm" as const;
export const KEY_LENGTH_BYTES = 32;
export const IV_LENGTH_BYTES = 12;
export const AUTH_TAG_LENGTH_BYTES = 16;

export const KEK_ENV_VAR = "PROBOT_KEY_ENCRYPTION_KEY";
