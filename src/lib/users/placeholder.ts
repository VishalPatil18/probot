const PLACEHOLDER_REGEX = /^user-[0-9a-f]{8}$/;

export function isPlaceholderUsername(username: string): boolean {
  return PLACEHOLDER_REGEX.test(username);
}
