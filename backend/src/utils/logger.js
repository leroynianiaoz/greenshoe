const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : arg
  ).join(' ');

  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${formattedArgs}`;
}

export const logger = {
  error: (message, ...args) => {
    if (currentLogLevel >= LOG_LEVELS.error) {
      console.error(formatMessage('error', message, ...args));
    }
  },

  warn: (message, ...args) => {
    if (currentLogLevel >= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', message, ...args));
    }
  },

  info: (message, ...args) => {
    if (currentLogLevel >= LOG_LEVELS.info) {
      console.log(formatMessage('info', message, ...args));
    }
  },

  debug: (message, ...args) => {
    if (currentLogLevel >= LOG_LEVELS.debug) {
      console.log(formatMessage('debug', message, ...args));
    }
  }
};
