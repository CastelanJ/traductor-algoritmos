/* Analisis semantico: revisa el significado, no la forma.
   Detecta variables usadas antes de definirse. */

function semanticAnalyze(ast) {
  const issues = [];
  const sym = {};
  
  function walk(n) {
    if (!n) return;
    if (n.type === "Read") {
      (n.vars || []).forEach(v => { sym[v] = { declared: true }; });
    } else if (n.type === "Assign") {
      // Primero se revisa la expresion y despues se declara la variable:
      // asi "X = X + 1" con X sin definir si se reporta como error.
      findUsed(n.expr);
      sym[n.id] = { declared: true };
    } else if (n.type === "Write") {
      if (n.expr.type === "ExpressionList") {
        n.expr.expressions.forEach(findUsed);
      } else {
        findUsed(n.expr);
      }
    } else if (n.type === "If") {
      findUsed(n.cond);
      walk(n.thenBlock);
      if (n.elseBlock) walk(n.elseBlock);
    } else if (n.type === "While") {
      findUsed(n.cond);
      walk(n.body);
    } else if (n.type === "Repeat") {
      walk(n.body);
      findUsed(n.cond);
    } else if (n.type === "Program" || n.type === "Statements") {
      // "Program" faltaba: como es la raiz del AST, walk() salia sin
      // revisar nada y el analisis semantico jamas reportaba errores.
      (n.children || []).forEach(c => walk(c));
    }
  }

  function findUsed(e) {
    if (!e) return;
    if (e.type === "Identifier") {
      if (!sym[e.name]) issues.push({ type: "semantic", msg: `Variable '${e.name}' usada antes de ser leída/asignada.` });
    } else if (e.type === "BinaryOp") {
      findUsed(e.left); findUsed(e.right);
    } else if (e.type === "UnaryOp") {
      findUsed(e.child);
    } else if (e.type === "ExpressionList") {
      e.expressions.forEach(findUsed);
    }
  }

  walk(ast);
  return { issues, sym };
}
