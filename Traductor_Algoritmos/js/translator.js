/* ---------------------------
  TRANSLATOR: AST -> JS
  --------------------------- */

function translateASTtoJS(ast) {
  if (!ast) return "";
  let lines = [];

  function t(n, indent = 0) {
    if (!n) return;
    const sp = ' '.repeat(indent);
    
    if (n.type === "Program") { t(n.children[0], indent); }
    else if (n.type === "Statements") { n.children.forEach(c => t(c, indent)); }
    else if (n.type === "Read") {
      n.vars.forEach(v => {
        lines.push(`${sp}let ${v} = prompt("Ingrese ${v}:");`);
        lines.push(`${sp}if(!isNaN(${v})) ${v} = Number(${v});`);
      });
    } 
    else if (n.type === "Write") {
      if (n.expr.type === "ExpressionList") {
        const expressions = n.expr.expressions.map(exprToJS);
        if (expressions.length > 1) {
          lines.push(`${sp}console.log(${expressions.join(" + ' ' + ")});`);
        } else {
          lines.push(`${sp}console.log(${expressions[0]});`);
        }
      } else {
        const expr = exprToJS(n.expr);
        lines.push(`${sp}console.log(${expr});`);
      }
    }
    else if (n.type === "Assign") {
      const expr = exprToJS(n.expr);
      lines.push(`${sp}${n.id} = ${expr};`);
    }
    else if (n.type === "If") {
      const cond = exprToJS(n.cond);
      lines.push(`${sp}if(${cond}){`);
      t(n.thenBlock, indent + 2);
      lines.push(`${sp}}`);
      if (n.elseBlock) {
        lines.push(`${sp}else{`);
        t(n.elseBlock, indent + 2);
        lines.push(`${sp}}`);
      }
    }
    else if (n.type === "While") {
      const cond = exprToJS(n.cond);
      lines.push(`${sp}while(${cond}){`);
      t(n.body, indent + 2);
      lines.push(`${sp}}`);
    }
    else if (n.type === "Repeat") {
      lines.push(`${sp}do{`);
      t(n.body, indent + 2);
      lines.push(`${sp}}while(!(${exprToJS(n.cond)})); // repeat until condition true`);
    }
  }

  function exprToJS(e) {
    if (!e) return "undefined";
    if (e.type === "Number") return e.value;
    if (e.type === "String") return JSON.stringify(e.value);
    if (e.type === "Identifier") return e.name;
    if (e.type === "BinaryOp") {
      const opMap = {
        "==": "===",
        "!=": "!==",
        "AND": "&&",
        "OR": "||"
      };
      const jsOp = opMap[e.op] || e.op;
      return `(${exprToJS(e.left)} ${jsOp} ${exprToJS(e.right)})`;
    }
    if (e.type === "UnaryOp") return e.op === "-" ? `(-${exprToJS(e.child)})` : `( !${exprToJS(e.child)} )`;
    return "undefined";
  }

  t(ast);
  return lines.join("\n");
}
