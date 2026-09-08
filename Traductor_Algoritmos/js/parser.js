/* ---------------------------
  PARSER (recursivo descendente)
  --------------------------- */

function Parser(tokens) {
  this.tokens = tokens.filter(t => t.type !== "EOL"); // remove EOL
  this.pos = 0;
}

Parser.prototype.peek = function() { return this.tokens[this.pos] || null; };
Parser.prototype.next = function() { return this.tokens[this.pos++] || null; };
Parser.prototype.expect = function(type, vals) {
  const t = this.peek();
  if (!t) throw { msg: `Se esperaba ${type} pero encontramos EOF`, token: null };
  if (t.type !== type) throw { msg: `Se esperaba ${type} pero se encontró ${t.type} (${t.value}) en línea ${t.line}`, token: t };
  if (vals && !vals.includes(t.value)) throw { msg: `Se esperaba uno de ${vals} pero se encontró ${t.value} en línea ${t.line}`, token: t };
  return this.next();
};

function makeNode(type, props) {
  return Object.assign({ type, children: [] }, props || {});
}

/* expression parser - operator precedence */
Parser.prototype.parseExpression = function() { return this.parseOr(); };

Parser.prototype.parseOr = function() {
  let node = this.parseAnd();
  while (this.peek() && this.peek().type === "ID" && this.peek().value.toUpperCase() === "O") {
    this.next(); // consume 'o'
    let rhs = this.parseAnd();
    node = makeNode("BinaryOp", { op: "OR", left: node, right: rhs });
  }
  return node;
};

Parser.prototype.parseAnd = function() {
  let node = this.parseRel();
  while (this.peek() && this.peek().type === "ID" && this.peek().value.toUpperCase() === "Y") {
    this.next();
    let rhs = this.parseRel();
    node = makeNode("BinaryOp", { op: "AND", left: node, right: rhs });
  }
  return node;
};

Parser.prototype.parseRel = function() {
  let node = this.parseAdd();
  while (this.peek() && this.peek().type === "OP" && ["==", "!=", "<", ">", "<=", ">="].includes(this.peek().value)) {
    let op = this.next().value;
    let rhs = this.parseAdd();
    node = makeNode("BinaryOp", { op, left: node, right: rhs });
  }
  return node;
};

Parser.prototype.parseAdd = function() {
  let node = this.parseMul();
  while (this.peek() && this.peek().type === "OP" && ["+", "-"].includes(this.peek().value)) {
    let op = this.next().value;
    let rhs = this.parseMul();
    node = makeNode("BinaryOp", { op, left: node, right: rhs });
  }
  return node;
};

Parser.prototype.parseMul = function() {
  let node = this.parseUnary();
  while (this.peek() && this.peek().type === "OP" && ["*", "/"].includes(this.peek().value)) {
    let op = this.next().value;
    let rhs = this.parseUnary();
    node = makeNode("BinaryOp", { op, left: node, right: rhs });
  }
  return node;
};

Parser.prototype.parseUnary = function() {
  if (this.peek() && this.peek().type === "OP" && this.peek().value === "-") {
    this.next();
    let val = this.parsePrimary();
    return makeNode("UnaryOp", { op: "-", child: val });
  }
  return this.parsePrimary();
};

Parser.prototype.parsePrimary = function() {
  const t = this.peek();
  if (!t) throw { msg: "Expresión incompleta (EOF)", token: null };
  if (t.type === "NUMBER") { this.next(); return makeNode("Number", { value: t.value }); }
  if (t.type === "STRING") { this.next(); return makeNode("String", { value: t.value }); }
  if (t.type === "ID") { this.next(); return makeNode("Identifier", { name: t.value }); }
  // Accept parentheses when token is SYM or OP
  if ((t.type === "SYM" || t.type === "OP") && t.value === "(") {
    this.next();
    let e = this.parseExpression();
    const tp = this.peek();
    if (tp && (tp.value === ")" && (tp.type === "SYM" || tp.type === "OP"))) {
      this.next();
    } else {
      throw { msg: "Falta )", token: tp };
    }
    return e;
  }
  // allow keywords 'NO' (not) as unary
  if (t.type === "ID" && t.value.toUpperCase() === "NO") { this.next(); let c = this.parsePrimary(); return makeNode("UnaryOp", { op: "NOT", child: c }); }
  throw { msg: `Token inválido en expresión: ${t.type} ${t.value}`, token: t };
};

/* Higher level */
Parser.prototype.parseProgram = function() {
  try {
    const root = makeNode("Program");
    // optional INICIO ... FIN or direct statements
    if (this.peek() && this.peek().type === "KW" && this.peek().value === "INICIO") {
      this.next(); 
      // allow optional semicolon after INICIO
      if (this.peek() && this.peek().type === "SYM" && this.peek().value === ";") this.next();
    }
    root.children.push(this.parseStatements());
    if (this.peek() && this.peek().type === "KW" && this.peek().value === "FIN") { this.next(); }
    return root;
  } catch (e) { throw e; }
};

Parser.prototype.parseStatements = function() {
  const container = makeNode("Statements");
  while (this.peek()) {
    const p = this.peek();
    if (p.type === "KW" && ["FIN", "SINO", "FIN_SI", "FIN_MIENTRAS", "FIN_PARA", "HASTA"].includes(p.value)) break;
    const st = this.parseStatement();
    if (st) container.children.push(st);
    else break;
  }
  return container;
};

// Soporta múltiples argumentos en ESCRIBIR
Parser.prototype.parseStatement = function() {
  const p = this.peek();
  if (!p) return null;
  
  // LEER statement
  if (p.type === "KW" && p.value === "LEER") {
    this.next(); // consume LEER
    const ids = [];
    while (this.peek() && (this.peek().type === "ID" || (this.peek().type === "SYM" && this.peek().value === ","))) {
      if (this.peek().type === "ID") { 
        ids.push(this.next().value); 
      } else { 
        this.next(); // comma
      }
    }
    if (this.peek() && this.peek().type === "SYM" && this.peek().value === ";") this.next();
    return makeNode("Read", { vars: ids });
  }
  
  // ESCRIBIR statement
  if (p.type === "KW" && p.value === "ESCRIBIR") {
    this.next(); // consume ESCRIBIR
    
    const expressions = [];
    expressions.push(this.parseExpression());
    
    while (this.peek() && this.peek().type === "SYM" && this.peek().value === ",") {
      this.next(); // consume comma
      expressions.push(this.parseExpression());
    }
    
    if (this.peek() && this.peek().type === "SYM" && this.peek().value === ";") this.next();
    return makeNode("Write", { expr: expressions.length === 1 ? expressions[0] : makeNode("ExpressionList", { expressions }) });
  }
  
  // ASSIGN statement
  if (p.type === "ID") {
    const id = this.next().value;
    if (this.peek() && this.peek().type === "OP" && this.peek().value === "=") {
      this.next();
      const expr = this.parseExpression();
      if (this.peek() && this.peek().type === "SYM" && this.peek().value === ";") this.next();
      return makeNode("Assign", { id, expr });
    } else {
      throw { msg: `Se esperaba '=' después del identificador ${id} en línea ${p.line}`, token: p };
    }
  }
  
  // IF statement
  if (p.type === "KW" && p.value === "SI") {
    this.next();
    const cond = this.parseExpression();
    if (this.peek() && this.peek().type === "KW" && this.peek().value === "ENTONCES") { 
      this.next(); 
    } else {
      throw { msg: "Falta ENTONCES en la sentencia SI", token: this.peek() };
    }
    const thenBlock = this.parseStatements();
    let elseBlock = null;
    if (this.peek() && this.peek().type === "KW" && this.peek().value === "SINO") { 
      this.next(); 
      elseBlock = this.parseStatements(); 
    }
    if (this.peek() && this.peek().type === "KW" && this.peek().value === "FIN_SI") { 
      this.next(); 
    } else {
      throw { msg: "Falta FIN_SI al final de IF", token: this.peek() };
    }
    return makeNode("If", { cond, thenBlock, elseBlock });
  }
  
  // WHILE statement
  if (p.type === "KW" && p.value === "MIENTRAS") {
    this.next();
    const cond = this.parseExpression();
    if (this.peek() && this.peek().type === "KW" && this.peek().value === "HACER") { 
      this.next(); 
    } else {
      throw { msg: "Falta HACER en MIENTRAS", token: this.peek() };
    }
    const body = this.parseStatements();
    if (this.peek() && this.peek().type === "KW" && this.peek().value === "FIN_MIENTRAS") { 
      this.next(); 
    } else {
      throw { msg: "Falta FIN_MIENTRAS", token: this.peek() };
    }
    return makeNode("While", { cond, body });
  }
  
  // REPEAT statement
  if (p.type === "KW" && p.value === "REPETIR") {
    this.next();
    const body = this.parseStatements();
    if (this.peek() && this.peek().type === "KW" && this.peek().value === "HASTA") { 
      this.next(); 
    } else {
      throw { msg: "Falta HASTA en REPETIR", token: this.peek() };
    }
    const cond = this.parseExpression();
    if (this.peek() && this.peek().type === "SYM" && this.peek().value === ";") this.next();
    return makeNode("Repeat", { cond, body });
  }
  
  throw { msg: `Instrucción no reconocida: ${p.type} ${p.value} en línea ${p.line}`, token: p };
};
