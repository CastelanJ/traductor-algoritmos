import fs from "node:fs";
import vm from "node:vm";

const base = "../public/traductor/js/";
const src = ["lexer.js","parser.js","semantic.js","translator.js"]
  .map(f => fs.readFileSync(new URL(base + f, import.meta.url), "utf8")).join("\n");
const ctx = vm.createContext({ console });
vm.runInContext(src, ctx);

const codigo = `LEER A;
SI A > 10 ENTONCES
  ESCRIBIR "grande";
FIN_SI;`;

console.log("=== PSEUDOCODIGO ===");
console.log(codigo);

console.log("\n=== TOKENS (lo que muestra el panel) ===");
const toks = ctx.simpleLexer(codigo).filter(t => t.type !== "EOL");
toks.forEach((t, i) =>
  console.log(String(i + 1).padStart(3) + ". " + t.type.padEnd(8) + (t.value || "").padEnd(10) + "linea " + t.line));

console.log("\n=== ARBOL (AST) ===");
const ast = new ctx.Parser(toks).parseProgram();
(function pinta(n, pre = "", ultimo = true) {
  if (!n) return;
  const etiqueta = n.type + (n.vars ? " " + n.vars.join(",") : "") +
    (n.id ? " " + n.id : "") + (n.op ? " " + n.op : "") +
    (n.name ? " " + n.name : "") + (n.value !== undefined ? " " + n.value : "");
  console.log(pre + (pre ? (ultimo ? "└─ " : "├─ ") : "") + etiqueta);
  const hijos = [];
  if (n.children) hijos.push(...n.children);
  for (const k of ["cond","thenBlock","elseBlock","body","expr","left","right","child"])
    if (n[k]) hijos.push(n[k]);
  hijos.forEach((h, i) =>
    pinta(h, pre + (pre ? (ultimo ? "   " : "│  ") : ""), i === hijos.length - 1));
})(ast);

console.log("\n=== JAVASCRIPT GENERADO ===");
console.log(ctx.translateASTtoJS(ast));
