/* DESCRIPTION
- Goal: Be able to look at the log output in the console during development and easily see the file where the log call occurred.
- We create a single logger here, and import it elsewhere.
- The logger is only created once, when it's first imported.
- In each file, we extend the logger so that it produces namespaced logs.
-- Sadly, I can't see a way to adjust the log severity setting for each logger extension.
-- Future: Perhaps write a logger2.js file, that supplies a function that creates a custom logger for the calling file. The log level for each file could be set in a config file.
*/

/* NOTES

https://github.com/onubo/react-native-logs/blob/master/README.md

*/

// Imports
import _ from 'lodash';
import { logger, consoleTransport } from "react-native-logs";

// Internal imports
import appTier from 'src/application/appTier';




// Config
// We can choose a different label color for a particular extension.
// In the log line, this changes the background color around the extension name.
let extensionColors = {
  //Assets: "whiteBright",
}




// Build logger.

let debugTiers = 'dev stag'.split(' ');
//debugTiers.push('prod'); // testing

let severityLevel = (debugTiers.includes(appTier)) ? 'debug' : 'error';

const defaultConfig = {
  levels: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
  severity: "debug",
  transport: consoleTransport,
  transportOptions: {
    colors: {
      debug: "green",
      info: "blue",
      warn: "yellow",
      error: "red",
    },
    extensionColors,
  },
  async: true,
  dateFormat: "time", // Options: time, local, utc, iso.
  printLevel: true,
  printDate: true,
  enabled: true,
};

let logger1 = logger.createLogger(defaultConfig);
logger1.setSeverity(severityLevel);

logger1.debug("Logger created.");

// Shortcut generator, for convenience.
// loggerX will usually be a logger extension, created in another file that has imported this logger.
logger1.getShortcuts = (loggerX) => {
  return {
    deb: loggerX.debug,
    dj: (x) => { loggerX.debug(JSON.stringify(x)) } ,
    log: loggerX.info,
    lj: (x) => { loggerX.info(JSON.stringify(x, null, 2)) } ,
  }
}

export default logger1;






