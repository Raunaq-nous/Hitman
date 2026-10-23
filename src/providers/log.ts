// Structured JSON logging. Never pass secrets or personal data (emails, passwords) in fields.
type Fields = Record<string, unknown>;

function write(level: "info" | "warn" | "error", msg: string, fields: Fields = {}): void {
  const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...fields });
  if (level === "error") process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

export const log = {
  info: (msg: string, fields?: Fields): void => write("info", msg, fields),
  warn: (msg: string, fields?: Fields): void => write("warn", msg, fields),
  error: (msg: string, fields?: Fields): void => write("error", msg, fields),
};
