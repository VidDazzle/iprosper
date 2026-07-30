// Cheap first-pass boolean/keyword matcher. Supports a small, safe subset of
// boolean search: quoted phrases, AND / OR, parentheses, and NOT. This runs
// before the (more expensive) LLM classifier to cut volume.

type Token =
  | { t: 'term'; v: string }
  | { t: 'and' }
  | { t: 'or' }
  | { t: 'not' }
  | { t: 'lparen' }
  | { t: 'rparen' };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ t: 'lparen' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ t: 'rparen' });
      i++;
      continue;
    }
    if (ch === '"') {
      const end = expr.indexOf('"', i + 1);
      const phrase = end === -1 ? expr.slice(i + 1) : expr.slice(i + 1, end);
      tokens.push({ t: 'term', v: phrase.toLowerCase() });
      i = end === -1 ? expr.length : end + 1;
      continue;
    }
    // bare word — read until whitespace or paren
    let j = i;
    while (j < expr.length && !' \t\n()'.includes(expr[j])) j++;
    const word = expr.slice(i, j);
    const upper = word.toUpperCase();
    if (upper === 'AND') tokens.push({ t: 'and' });
    else if (upper === 'OR') tokens.push({ t: 'or' });
    else if (upper === 'NOT') tokens.push({ t: 'not' });
    else tokens.push({ t: 'term', v: word.toLowerCase() });
    i = j;
  }
  return tokens;
}

// Recursive-descent parser: OR has lowest precedence, then AND, then NOT/atom.
class Parser {
  private pos = 0;
  constructor(private tokens: Token[], private haystack: string) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  parse(): boolean {
    if (this.tokens.length === 0) return false;
    const result = this.parseOr();
    return result;
  }

  private parseOr(): boolean {
    let left = this.parseAnd();
    while (this.peek()?.t === 'or') {
      this.next();
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }

  private parseAnd(): boolean {
    let left = this.parseNot();
    // Implicit AND when two atoms sit adjacent, plus explicit AND.
    while (true) {
      const p = this.peek();
      if (p?.t === 'and') {
        this.next();
        left = this.parseNot() && left;
      } else if (p?.t === 'term' || p?.t === 'lparen' || p?.t === 'not') {
        left = this.parseNot() && left;
      } else {
        break;
      }
    }
    return left;
  }

  private parseNot(): boolean {
    if (this.peek()?.t === 'not') {
      this.next();
      return !this.parseAtom();
    }
    return this.parseAtom();
  }

  private parseAtom(): boolean {
    const tok = this.next();
    if (!tok) return false;
    if (tok.t === 'lparen') {
      const val = this.parseOr();
      if (this.peek()?.t === 'rparen') this.next();
      return val;
    }
    if (tok.t === 'term') {
      return this.haystack.includes(tok.v);
    }
    return false;
  }
}

/**
 * Evaluate a boolean expression against text. Case-insensitive; substring match
 * on each term. Malformed expressions return false rather than throwing.
 */
export function matchesExpression(expression: string, text: string): boolean {
  try {
    const tokens = tokenize(expression);
    const parser = new Parser(tokens, text.toLowerCase());
    return parser.parse();
  } catch {
    return false;
  }
}
