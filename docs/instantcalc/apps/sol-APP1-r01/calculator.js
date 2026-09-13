class CalcIssue extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

class Parser {
  constructor(source, resolveReference, resolveVariable) {
    this.source = source;
    this.resolveReference = resolveReference;
    this.resolveVariable = resolveVariable;
    this.position = 0;
  }

  parse() {
    const value = this.parseAdditive();
    this.skipSpaces();
    if (this.position < this.source.length) {
      throw new CalcIssue("error", `Unexpected “${this.source[this.position]}”`);
    }
    return this.finite(value);
  }

  parseAdditive() {
    let value = this.parseMultiplicative();
    while (true) {
      if (this.take("+")) value += this.parseMultiplicative();
      else if (this.take("-") || this.take("−")) value -= this.parseMultiplicative();
      else return this.finite(value);
    }
  }

  parseMultiplicative() {
    let value = this.parseUnary();
    while (true) {
      if (this.take("*") || this.take("×")) {
        value *= this.parseUnary();
      } else if (this.take("/") || this.take("÷")) {
        const divisor = this.parseUnary();
        if (divisor === 0) throw new CalcIssue("error", "Division by zero");
        value /= divisor;
      } else {
        return this.finite(value);
      }
    }
  }

  parseUnary() {
    if (this.take("+")) return this.parseUnary();
    if (this.take("-") || this.take("−")) return -this.parseUnary();
    return this.parsePower();
  }

  parsePower() {
    const base = this.parsePostfix();
    if (!this.take("^")) return base;
    return this.finite(base ** this.parseUnary());
  }

  parsePostfix() {
    let value = this.parsePrimary();
    while (this.take("%")) value /= 100;
    return value;
  }

  parsePrimary() {
    this.skipSpaces();
    if (this.position >= this.source.length) {
      throw new CalcIssue("incomplete", "Keep typing");
    }

    if (this.take("(")) {
      const value = this.parseAdditive();
      if (!this.take(")")) {
        this.skipSpaces();
        if (this.position >= this.source.length) {
          throw new CalcIssue("incomplete", "Close the parenthesis");
        }
        throw new CalcIssue("error", "Expected a closing parenthesis");
      }
      return value;
    }

    const rest = this.source.slice(this.position);
    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) {
      this.position += number[0].length;
      return Number(number[0]);
    }

    if (rest[0] === ".") {
      this.position += 1;
      this.skipSpaces();
      throw new CalcIssue(
        this.position >= this.source.length ? "incomplete" : "error",
        "Enter digits after the decimal point",
      );
    }

    if (rest[0] === "$") {
      this.position += 1;
      const digits = this.source.slice(this.position).match(/^\d+/)?.[0];
      if (!digits) {
        this.skipSpaces();
        throw new CalcIssue(
          this.position >= this.source.length ? "incomplete" : "error",
          "Choose a line from 1 to 10",
        );
      }
      this.position += digits.length;
      const lineNumber = Number(digits);
      if (lineNumber < 1 || lineNumber > 10) {
        throw new CalcIssue("error", "References must be from $1 to $10");
      }
      return this.resolveReference(lineNumber);
    }

    if (rest[0] === "@") {
      this.position += 1;
      const name = this.source.slice(this.position).match(/^[a-zA-Z][a-zA-Z0-9_]*/)?.[0];
      if (!name) {
        this.skipSpaces();
        throw new CalcIssue(
          this.position >= this.source.length ? "incomplete" : "error",
          "Enter a variable name after @",
        );
      }
      this.position += name.length;
      return this.resolveVariable(name);
    }

    const identifier = rest.match(/^[a-zA-Z]+/)?.[0];
    if (identifier) {
      this.position += identifier.length;
      if (identifier !== "sqrt") {
        this.skipSpaces();
        const unfinished = "sqrt".startsWith(identifier) && this.position >= this.source.length;
        throw new CalcIssue(unfinished ? "incomplete" : "error", "Only sqrt() is supported");
      }
      if (!this.take("(")) {
        this.skipSpaces();
        throw new CalcIssue(
          this.position >= this.source.length ? "incomplete" : "error",
          "Use sqrt(…)",
        );
      }
      const value = this.parseAdditive();
      if (!this.take(")")) {
        this.skipSpaces();
        throw new CalcIssue(
          this.position >= this.source.length ? "incomplete" : "error",
          "Close the square root",
        );
      }
      if (value < 0) throw new CalcIssue("error", "Square root needs a positive value");
      return Math.sqrt(value);
    }

    throw new CalcIssue("error", `Unexpected “${rest[0]}”`);
  }

  take(character) {
    this.skipSpaces();
    if (this.source[this.position] !== character) return false;
    this.position += 1;
    return true;
  }

  skipSpaces() {
    while (/\s/.test(this.source[this.position] ?? "")) this.position += 1;
  }

  finite(value) {
    if (!Number.isFinite(value)) throw new CalcIssue("error", "Result is not a finite number");
    return value;
  }
}

export function validateVariables(variables = []) {
  const rows = variables.map((variable) => ({
    name: typeof variable?.name === "string" ? variable.name.trim() : "",
    rawValue:
      typeof variable?.value === "string" || typeof variable?.value === "number"
        ? String(variable.value).trim()
        : "",
  }));
  const validName = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  const nameCounts = new Map();

  for (const row of rows) {
    if (!validName.test(row.name)) continue;
    const key = row.name.toLowerCase();
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  return rows.map(({ name, rawValue }) => {
    if (!name && !rawValue) return { status: "empty" };
    if (!name) return { status: "incomplete", message: "Enter a variable name" };
    if (!validName.test(name)) {
      return {
        status: "error",
        message: "Names start with a letter and use only letters, numbers, or _",
      };
    }
    if (nameCounts.get(name.toLowerCase()) > 1) {
      return { status: "error", message: `Duplicate variable @${name}` };
    }
    if (!rawValue) return { status: "incomplete", message: `Enter a value for @${name}` };
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(rawValue)) {
      return { status: "error", message: "Variable values must be decimal numbers" };
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      return { status: "error", message: "Variable value is not a finite number" };
    }
    return { status: "result", name, value };
  });
}

export function evaluateWorksheet(expressions, variables = []) {
  const lines = Array.from({ length: 10 }, (_, index) => expressions[index] ?? "");
  const results = Array(10);
  const states = Array(10).fill("new");
  const cycleLines = new Set();
  const variableLookup = new Map();

  validateVariables(variables).forEach((variable) => {
    if (variable.status === "result") {
      variableLookup.set(variable.name.toLowerCase(), variable.value);
    }
  });

  function evaluateLine(index, stack = []) {
    if (states[index] === "done") return results[index];
    if (states[index] === "visiting") {
      const cycleStart = stack.indexOf(index);
      for (const line of stack.slice(cycleStart)) cycleLines.add(line);
      throw new CalcIssue("circular", "Circular reference");
    }

    const expression = lines[index].trim();
    if (!expression) {
      states[index] = "done";
      results[index] = { status: "empty" };
      return results[index];
    }

    states[index] = "visiting";
    try {
      const parser = new Parser(
        expression,
        (lineNumber) => {
          const referenced = evaluateLine(lineNumber - 1, [...stack, index]);
          if (referenced.status === "result") return referenced.value;
          if (referenced.status === "circular" && cycleLines.has(index)) {
            throw new CalcIssue("circular", "Circular reference");
          }
          throw new CalcIssue("dependency", `Waiting for line ${lineNumber}`);
        },
        (name) => {
          const value = variableLookup.get(name.toLowerCase());
          if (value !== undefined) return value;
          throw new CalcIssue("dependency", `Waiting for variable @${name}`);
        },
      );
      results[index] = { status: "result", value: parser.parse() };
    } catch (error) {
      if (!(error instanceof CalcIssue)) throw error;
      results[index] = { status: error.kind, message: error.message };
    }
    states[index] = "done";
    return results[index];
  }

  for (let index = 0; index < 10; index += 1) evaluateLine(index);
  return results;
}

export function calculateTotal(results) {
  const total = {
    value: 0,
    includedCount: 0,
    excludedCount: 0,
    excludedLines: [],
  };

  results.slice(0, 10).forEach((result, index) => {
    if (result?.status === "result" && Number.isFinite(result.value)) {
      total.value += result.value;
      total.includedCount += 1;
    } else {
      total.excludedCount += 1;
      total.excludedLines.push(index + 1);
    }
  });

  return total;
}

export function formatResult(value) {
  if (Object.is(value, -0)) return "0";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}
