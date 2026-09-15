const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const configuredLevel =
  process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");
const activeLevel = levels[configuredLevel] ?? levels.info;

function write(level, args) {
  if (levels[level] > activeLevel) return;

  const entry = {
    level,
    time: new Date().toISOString(),
    message: args[0],
  };

  if (args.length > 1) {
    entry.context = args.length === 2 ? args[1] : args.slice(1);
  }

  const line = JSON.stringify(entry);
  if (level === "error") {
    process.stderr.write(`${line}\n`);
    return;
  }
  process.stdout.write(`${line}\n`);
}

module.exports = {
  error: (...args) => write("error", args),
  warn: (...args) => write("warn", args),
  info: (...args) => write("info", args),
  debug: (...args) => write("debug", args),
};
