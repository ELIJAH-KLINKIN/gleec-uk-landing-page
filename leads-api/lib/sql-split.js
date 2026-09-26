// Splits a SQL script into single statements (Neon's HTTP driver runs one per query).
// Understands -- and /* */ comments, 'strings', "identifiers" and $tag$ dollar quotes,
// so semicolons inside any of those do not split. Comment-only chunks are dropped.

export function splitSqlStatements(script) {
  const statements = [];
  let current = '';
  let hasCode = false;
  let i = 0;

  const append = (text, isCode) => {
    current += text;
    if (isCode && /\S/.test(text)) hasCode = true;
  };
  const push = () => {
    if (hasCode) statements.push(current.trim());
    current = '';
    hasCode = false;
  };
  const until = (needle, from) => {
    const end = script.indexOf(needle, from);
    return end === -1 ? script.length : end + needle.length;
  };

  while (i < script.length) {
    const ch = script[i];
    const next = script[i + 1];
    let stop;

    if (ch === '-' && next === '-') {
      stop = until('\n', i);
      append(script.slice(i, stop), false);
    } else if (ch === '/' && next === '*') {
      stop = until('*/', i + 2);
      append(script.slice(i, stop), false);
    } else if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < script.length) {
        if (script[j] === ch && script[j + 1] === ch) j += 2; // doubled-quote escape
        else if (script[j] === ch) break;
        else j += 1;
      }
      stop = Math.min(j + 1, script.length);
      append(script.slice(i, stop), true);
    } else if (ch === '$' && /^\$[A-Za-z_]*\$/.test(script.slice(i, i + 64))) {
      const tag = /^\$[A-Za-z_]*\$/.exec(script.slice(i, i + 64))[0];
      stop = until(tag, i + tag.length);
      append(script.slice(i, stop), true);
    } else if (ch === ';') {
      push();
      stop = i + 1;
    } else {
      append(ch, true);
      stop = i + 1;
    }
    i = stop;
  }
  push();
  return statements;
}
