const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define formats
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Format key pieces of data for JSON logs
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const transports = [
  // Console Transport (Always Active)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      format
    ),
  })
];

// Only add File transports in Development (Cloud Run filesystem is read-only)
/* 
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: jsonFormat,
    })
  );
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/all.log'),
      format: jsonFormat,
    })
  );
}
*/

const Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  transports,
});

module.exports = Logger;
