
// Options: 'dev', 'stag', 'prod'.
// Note: The log level depends on this setting.
// We store this setting here so that it can be easily imported in utility files, such as util/logger.js.
// The 'dev' (development) version connects to a developer server, which (almost always) doesn't have access to actual cryptocurrency. It may have access to testnet cryptocurrency.
// The 'stag' (staging) version connects to the test server, which doesn't have access to actual cryptocurrency.
// The 'prod' (production) version connects to the production server, which _does_ have access to actual cryptocurrency.

export const appTier = 'dev';

export default appTier;
