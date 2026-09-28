// Fraction parsing / nearest-fraction helpers.

function gcd(a, b) { return b ? gcd(b, a % b) : a; }

// Parses: "0.375", ".375", "3/8", "1 3/8", "1-3/8", "1-3/8\"", "1.5in"
export function parseNumber(str) {
  if (str === null || str === undefined) return NaN;
  let s = String(str).trim().toLowerCase().replace(/["”]|in(ch(es)?)?$/g, '').trim();
  if (s === '') return NaN;
  let neg = false;
  if (s.startsWith('-')) { neg = true; s = s.slice(1).trim(); }
  let m = s.match(/^(\d+)\s*[- ]\s*(\d+)\s*\/\s*(\d+)$/); // mixed number
  if (m) { const d = +m[3]; if (!d) return NaN; const v = +m[1] + (+m[2]) / d; return neg ? -v : v; }
  m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) { const d = +m[2]; if (!d) return NaN; const v = (+m[1]) / d; return neg ? -v : v; }
  if (/^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/.test(s)) { const v = parseFloat(s); return neg ? -v : v; }
  return NaN;
}

// Nearest fraction with given max denominator (power of 2), reduced.
export function nearestFraction(x, denom = 64) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  let n = Math.round(ax * denom);
  let whole = Math.floor(n / denom);
  let num = n - whole * denom;
  let den = denom;
  if (num) { const g = gcd(num, den); num /= g; den /= g; }
  const value = sign * n / denom;
  const error = x - value;
  let text;
  if (num === 0) text = `${sign < 0 ? '-' : ''}${whole}`;
  else if (whole === 0) text = `${sign < 0 ? '-' : ''}${num}/${den}`;
  else text = `${sign < 0 ? '-' : ''}${whole}-${num}/${den}`;
  return { whole, num, den, value, error, text };
}

export function fracText(num, den) {
  const whole = Math.floor(num / den); let n = num - whole * den; let d = den;
  if (n) { const g = gcd(n, d); n /= g; d /= g; }
  if (!n) return `${whole}`;
  return whole ? `${whole}-${n}/${d}` : `${n}/${d}`;
}
