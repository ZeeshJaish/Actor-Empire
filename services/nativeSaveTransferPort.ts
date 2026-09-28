/** Selects only a registered native streamed transport; web keeps its legacy file path. */
export const selectNativeSaveTransferPort = <T>(
  platform: string,
  isNative: boolean,
  isRegistered: boolean,
  ports: { android: T; ios: T },
): T | null => {
  if (!isNative || !isRegistered) return null;
  if (platform === 'android') return ports.android;
  if (platform === 'ios') return ports.ios;
  return null;
};

export const assertNativeSaveTransferShared = (result: { shared?: boolean }): void => {
  if (result.shared === false) throw new Error('Save transfer sharing was cancelled.');
};
