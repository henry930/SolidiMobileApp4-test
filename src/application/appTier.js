
// Options: 'dev', 'stag', 'prod'.
// Note: The log level depends on this setting.
// We store this setting here so that it can be easily imported in utility files, such as util/logger.js.
// The 'stag' (staging) version connects to the test server, which doesn't have access to actual cryptocurrency.

export const appTier = 'prod';

export default appTier;
