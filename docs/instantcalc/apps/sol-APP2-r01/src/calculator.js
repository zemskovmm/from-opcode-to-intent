class CalculationIssue extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const pending = (message) => {
  throw new CalculationIssue("pending", message);
};

const invalid = (message = "Invalid expression") => {
  throw new CalculationIssue("error", message);
};

class Parser {
  constructor(source, availableReferences) {
    this.source = source;
    this.availableReferences = availableReferences;
    this.position = 0;
  }

  parse() {
    const expression = this.parseAddition();
    this.skipSpaces();
    if (!this.atEnd()) invalid();
    return expression;
  }

  parseAddition() {
    let left = this.parseMultiplication();

    while (true) {
      this.skipSpaces();
      const operator = this.peek();
      if (!["+", "-", "−"].includes(operator)) return left;
      this.position += 1;
      left = {
        type: "binary",
        operator,
        left,
        right: this.parseMultiplication(),
      };
    }
  }

  parseMultiplication() {
    let left = this.parseUnary();

    while (true) {
      this.skipSpaces();
      const operator = this.peek();
      if (!["*", "/", "×", "÷"].includes(operator)) return left;
      this.position += 1;
      left = {
        type: "binary",
        operator,
        left,
        right: this.parseUnary(),
      };
    }
  }

  parseUnary() {
    this.skipSpaces();
    if (["-", "−"].includes(this.peek())) {
      this.position += 1;
      return { type: "negative", value: this.parseUnary() };
    }
    return this.parsePercentage();
  }

  parsePercentage() {
    let value = this.parsePrimary();
    this.skipSpaces();
    while (this.peek() === "%") {
      this.position += 1;
      value = { type: "percentage", value };
      this.skipSpaces();
    }
    return value;
  }

  parsePrimary() {
    this.skipSpaces();
    if (this.atEnd()) pending();

    const character = this.peek();
    if (character === "(") return this.parseGroup();
    if (character === "$") return this.parseReference();
    if (character === "@") return this.parseVariable();
    if (this.isDigit(character) || character === ".") return this.parseNumber();
    invalid();
  }

  parseGroup() {
    this.position += 1;
    const value = this.parseAddition();
    this.skipSpaces();
    if (this.atEnd()) pending();
    if (this.peek() !== ")") invalid();
    this.position += 1;
    return value;
  }

  parseReference() {
    this.position += 1;
    const start = this.position;
    while (this.isDigit(this.peek())) this.position += 1;

    if (start === this.position) {
      this.skipSpaces();
      if (this.atEnd()) pending();
      invalid();
    }

    const line = Number(this.source.slice(start, this.position));
    if (line < 1 || line > this.availableReferences) {
      invalid(`Invalid reference $${line}`);
    }
    return { type: "reference", line };
  }

  parseVariable() {
    this.position += 1;
    const start = this.position;

    if (!this.isNameStart(this.peek())) {
      this.skipSpaces();
      if (this.atEnd()) pending();
      invalid();
    }

    this.position += 1;
    while (this.isNamePart(this.peek())) this.position += 1;
    return { type: "variable", name: this.source.slice(start, this.position) };
  }

  parseNumber() {
    const start = this.position;
    let digits = 0;

    while (this.isDigit(this.peek())) {
      this.position += 1;
      digits += 1;
    }

    if (this.peek() === ".") {
      this.position += 1;
      while (this.isDigit(this.peek())) {
        this.position += 1;
        digits += 1;
      }
    }

    if (digits === 0) {
      if (this.atEnd()) pending();
      invalid();
    }

    const value = Number(this.source.slice(start, this.position));
    if (!Number.isFinite(value)) invalid("Number is too large");
    return { type: "number", value };
  }

  skipSpaces() {
    while (/\s/u.test(this.peek() ?? "")) this.position += 1;
  }

  isDigit(character) {
    return character !== undefined && character >= "0" && character <= "9";
  }

  isNameStart(character) {
    return character !== undefined && /[A-Za-z_]/u.test(character);
  }

  isNamePart(character) {
    return character !== undefined && /[A-Za-z0-9_]/u.test(character);
  }

  peek() {
    return this.source[this.position];
  }

  atEnd() {
    return this.position >= this.source.length;
  }
}

function solve(node, previousResults, variables) {
  switch (node.type) {
    case "number":
      return node.value;
    case "reference": {
      const source = previousResults[node.line - 1];
      if (source.status === "blank" || source.status === "pending") {
        pending(`Waiting for $${node.line}`);
      }
      if (source.status === "error") {
        invalid(`Error in $${node.line}`);
      }
      return source.value;
    }
    case "variable":
      if (!variables.has(node.name)) invalid(`Unknown variable @${node.name}`);
      return variables.get(node.name);
    case "negative":
      return -solve(node.value, previousResults, variables);
    case "percentage":
      return solve(node.value, previousResults, variables) / 100;
    case "binary": {
      const left = solve(node.left, previousResults, variables);
      const right = solve(node.right, previousResults, variables);
      let value;

      if (node.operator === "+") value = left + right;
      else if (["-", "−"].includes(node.operator)) value = left - right;
      else if (["*", "×"].includes(node.operator)) value = left * right;
      else {
        if (right === 0) invalid("Cannot divide by zero");
        value = left / right;
      }

      if (!Number.isFinite(value)) invalid("Result is too large");
      return value;
    }
    default:
      invalid();
  }
}

export function formatResult(value) {
  if (Object.is(value, -0)) value = 0;
  if (Number.isInteger(value)) return String(value);
  const formatted = value.toFixed(2);
  return formatted === "-0.00" ? "0.00" : formatted;
}

export function evaluateExpression(expression, previousResults = [], variables = new Map()) {
  if (expression.trim() === "") return { status: "blank" };

  try {
    const tree = new Parser(expression, previousResults.length).parse();
    const value = solve(tree, previousResults, variables);
    return { status: "valid", value, display: formatResult(value) };
  } catch (error) {
    if (!(error instanceof CalculationIssue)) throw error;
    const result = { status: error.status };
    if (error.message) result.message = error.message;
    return result;
  }
}

export function calculateSheet(expressions, variables = new Map()) {
  const results = [];
  for (const expression of expressions) {
    results.push(evaluateExpression(expression, results, variables));
  }
  return results;
}

export function prepareVariables(rows) {
  const names = rows.map((row) => row.name.trim());
  const rawValues = rows.map((row) => row.value.trim());
  const errors = rows.map((_, index) => {
    const name = names[index];
    const value = rawValues[index];
    if (name === "" && value === "") return null;
    if (name === "") return "Name required";
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) return "Invalid name";
    if (value === "") return "Value required";
    if (!/^[+−-]?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(value)) return "Enter a number";
    if (!Number.isFinite(Number(value.replace("−", "-")))) return "Enter a number";
    return null;
  });

  const nameCounts = new Map();
  names.forEach((name) => {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) {
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }
  });
  names.forEach((name, index) => {
    if ((nameCounts.get(name) ?? 0) > 1) errors[index] = "Duplicate name";
  });

  const values = new Map();
  rows.forEach((_, index) => {
    if (errors[index] === null && names[index] !== "") {
      values.set(names[index], Number(rawValues[index].replace("−", "-")));
    }
  });
  return { values, errors };
}

export function calculateTotal(results) {
  const validResults = results.filter((result) => result.status === "valid");
  const value = validResults.reduce((sum, result) => sum + result.value, 0);
  const summary = {
    included: validResults.length,
    excluded: results.length - validResults.length,
  };

  if (!Number.isFinite(value)) {
    return { status: "error", message: "Total is too large", ...summary };
  }
  return { status: "valid", value, display: formatResult(value), ...summary };
}
