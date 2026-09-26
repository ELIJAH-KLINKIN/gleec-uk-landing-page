// One JSON object per line, which Vercel's log viewer can filter on.
// Callers must not pass personal data (email, name, phone, message).

export function createLogger(sink = console) {
  const write = (level, event, data = {}) => {
    const line = JSON.stringify({ level, event, ...data });
    if (level === 'error') sink.error(line);
    else if (level === 'warn') sink.warn(line);
    else sink.log(line);
  };
  return {
    info: (event, data) => write('info', event, data),
    warn: (event, data) => write('warn', event, data),
    error: (event, data) => write('error', event, data),
  };
}
