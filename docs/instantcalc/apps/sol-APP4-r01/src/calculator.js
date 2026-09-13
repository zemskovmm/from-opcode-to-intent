class SyntaxIssue extends Error {
  constructor(kind) {
    super(kind);
    this.kind = kind;
  }
}

const incomplete = () => {
  throw new SyntaxIssue("incomplete");
};

const invalid = () => {
  throw new SyntaxIssue("invalid");
};

function tokenize(source) {
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(character)) {
      const start = index;
      while (index < source.length && /[0-9.]/.test(source[index])) index += 1;
      const raw = source.slice(start, index);
      const dots = [...raw].filter((value) => value === ".").length;
      if (dots > 1) invalid();
      tokens.push({ type: raw === "." ? "incomplete-number" : "number", value: Number(raw) });
      continue;
    }

    if (character === "$") {
      index += 1;
      const start = index;
      if (/[0-9]/.test(source[index] ?? "")) {
        while (index < source.length && /[0-9]/.test(source[index])) index += 1;
        const raw = source.slice(start, index);
        tokens.push({ type: "reference", value: Number(raw), raw });
        continue;
      }
      if (/[a-z]/.test(source[index] ?? "")) {
        while (index < source.length && /[a-z0-9_]/.test(source[index])) index += 1;
        tokens.push({ type: "variable-reference", value: source.slice(start, index) });
        continue;
      }
      if (source.slice(index).trim() === "") incomplete();
      invalid();
    }

    if (/[A-Za-z]/.test(character)) {
      const start = index;
      while (index < source.length && /[A-Za-z]/.test(source[index])) index += 1;
      const word = source.slice(start, index);
      if (word === "sqrt") {
        tokens.push({ type: "sqrt" });
        continue;
      }
      if ("sqrt".startsWith(word) && source.slice(index).trim() === "") incomplete();
      invalid();
    }

    if ("+-*/^%()".includes(character)) {
      tokens.push({ type: character });
      index += 1;
      continue;
    }

    invalid();
  }

  tokens.push({ type: "end" });
  return tokens;
}

class Parser {
  constructor(tokens, rowNumber) {
    this.tokens = tokens;
    this.rowNumber = rowNumber;
    this.index = 0;
    this.dependencies = [];
  }

  current() {
    return this.tokens[this.index];
  }

  take(type) {
    if (this.current().type !== type) return false;
    this.index += 1;
    return true;
  }

  parse() {
    const tree = this.additive();
    if (this.current().type !== "end") invalid();
    return { tree, dependencies: this.dependencies };
  }

  additive() {
    let left = this.multiplicative();
    while (["+", "-"].includes(this.current().type)) {
      const operator = this.current().type;
      this.index += 1;
      left = { type: "binary", operator, left, right: this.multiplicative() };
    }
    return left;
  }

  multiplicative() {
    let left = this.unary();
    while (["*", "/"].includes(this.current().type)) {
      const operator = this.current().type;
      this.index += 1;
      left = { type: "binary", operator, left, right: this.unary() };
    }
    return left;
  }

  unary() {
    if (["+", "-"].includes(this.current().type)) {
      const operator = this.current().type;
      this.index += 1;
      return { type: "unary", operator, value: this.unary() };
    }
    return this.power();
  }

  power() {
    const base = this.postfix();
    if (!this.take("^")) return base;
    return { type: "binary", operator: "^", left: base, right: this.unary() };
  }

  postfix() {
    const value = this.primary();
    if (!this.take("%")) return value;
    return { type: "percent", value };
  }

  primary() {
    const token = this.current();

    if (token.type === "end" || token.type === "incomplete-number") incomplete();

    if (this.take("number")) return { type: "number", value: token.value };

    if (this.take("reference")) {
      if (
        token.raw !== String(token.value) ||
        token.value < 1 ||
        token.value > 10 ||
        token.value >= this.rowNumber
      ) invalid();
      this.dependencies.push({ type: "row", value: token.value, label: String(token.value) });
      return { type: "row-reference", value: token.value };
    }

    if (this.take("variable-reference")) {
      this.dependencies.push({ type: "variable", value: token.value, label: token.value });
      return { type: "variable-reference", value: token.value };
    }

    if (this.take("(")) {
      if (this.current().type === ")") invalid();
      const value = this.additive();
      if (this.take(")")) return value;
      if (this.current().type === "end") incomplete();
      invalid();
    }

    if (this.take("sqrt")) {
      if (!this.take("(")) {
        if (this.current().type === "end") incomplete();
        invalid();
      }
      if (this.current().type === ")") incomplete();
      const value = this.additive();
      if (this.take(")")) return { type: "sqrt", value };
      if (this.current().type === "end") incomplete();
      invalid();
    }

    invalid();
  }
}

function parseExpression(source, rowNumber) {
  return new Parser(tokenize(source), rowNumber).parse();
}

function evaluate(tree, values, variables) {
  switch (tree.type) {
    case "number":
      return tree.value;
    case "row-reference":
      return values[tree.value - 1];
    case "variable-reference":
      return variables.get(tree.value);
    case "unary":
      return tree.operator === "-"
        ? -evaluate(tree.value, values, variables)
        : evaluate(tree.value, values, variables);
    case "percent":
      return evaluate(tree.value, values, variables) / 100;
    case "sqrt":
      return Math.sqrt(evaluate(tree.value, values, variables));
    case "binary": {
      const left = evaluate(tree.left, values, variables);
      const right = evaluate(tree.right, values, variables);
      if (tree.operator === "+") return left + right;
      if (tree.operator === "-") return left - right;
      if (tree.operator === "*") return left * right;
      if (tree.operator === "/") return left / right;
      return left ** right;
    }
    default:
      return Number.NaN;
  }
}

export function formatResult(value) {
  if (Object.is(value, -0)) return "0";

  const absolute = Math.abs(value);
  if (absolute >= 1e12 || (absolute > 0 && absolute < 0.01)) {
    return value.toExponential(2);
  }

  if (Number.isInteger(value)) return String(value);
  const fixed = value.toFixed(2);
  return fixed === "-0.00" ? "0" : fixed;
}

const result = (kind, display, value) => ({ kind, display, value });

const variableNamePattern = /^[a-z][a-z0-9_]*$/;
const variableValuePattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

export function analyzeVariables(variables = []) {
  const nameCounts = new Map();
  for (const variable of variables) {
    if (variableNamePattern.test(variable.name)) {
      nameCounts.set(variable.name, (nameCounts.get(variable.name) ?? 0) + 1);
    }
  }

  const values = new Map();
  const entries = variables.map((variable) => {
    const name = variable.name;
    const rawValue = variable.value.trim();

    if (name === "" && rawValue === "") return { kind: "empty", message: "" };
    if (name === "") return { kind: "incomplete", message: "Add a name" };
    if (!variableNamePattern.test(name)) return { kind: "invalid", message: "Check name" };
    if (nameCounts.get(name) > 1) return { kind: "invalid", message: "Name already used" };
    if (rawValue === "") return { kind: "incomplete", message: "Add a value" };
    if (!variableValuePattern.test(rawValue)) return { kind: "invalid", message: "Check value" };

    const value = Number(rawValue);
    if (!Number.isFinite(value)) return { kind: "invalid", message: "Check value" };
    values.set(name, value);
    return { kind: "ready", message: "Ready", value };
  });

  return { entries, values };
}

export function calculateWorksheet(expressions, variables = []) {
  const results = [];
  const values = [];
  const analyzedVariables = analyzeVariables(variables);

  expressions.forEach((expression, index) => {
    if (expression.trim() === "") {
      results.push(result("blank", "", undefined));
      values.push(undefined);
      return;
    }

    let parsed;
    try {
      parsed = parseExpression(expression, index + 1);
    } catch (error) {
      const kind = error instanceof SyntaxIssue ? error.kind : "invalid";
      results.push(result(kind, kind === "incomplete" ? "…" : "Check expression", undefined));
      values.push(undefined);
      return;
    }

    const unavailable = parsed.dependencies.find((dependency) => {
      if (dependency.type === "row") return results[dependency.value - 1]?.kind !== "success";
      return !analyzedVariables.values.has(dependency.value);
    });
    if (unavailable !== undefined) {
      results.push(result("waiting", `Waiting for $${unavailable.label}`, undefined));
      values.push(undefined);
      return;
    }

    const value = evaluate(parsed.tree, values, analyzedVariables.values);
    if (!Number.isFinite(value)) {
      results.push(result("undefined", "Undefined", undefined));
      values.push(undefined);
      return;
    }

    results.push(result("success", formatResult(value), value));
    values.push(value);
  });

  return results;
}

export function calculateTotal(results) {
  const successful = results.filter((lineResult) => lineResult.kind === "success");
  const value = successful.reduce((sum, lineResult) => sum + lineResult.value, 0);
  const included = successful.length;
  const excluded = results.length - included;

  return {
    value: Number.isFinite(value) ? value : undefined,
    display: Number.isFinite(value) ? formatResult(value) : "Undefined",
    included,
    excluded,
    summary: `${included} included · ${excluded} excluded`,
  };
}
