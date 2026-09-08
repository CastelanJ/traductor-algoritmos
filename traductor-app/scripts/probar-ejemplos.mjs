import fs from "node:fs";
import vm from "node:vm";

const base = "../public/traductor/js/";
const src = ["lexer.js","parser.js","semantic.js","translator.js"]
  .map(f => fs.readFileSync(new URL(base + f, import.meta.url), "utf8")).join("\n");
const ctx = vm.createContext({ console });
vm.runInContext(src, ctx);

const ejemplos = {
"1. Suma y clasifica": `INICIO;
LEER A, B;
C = A + B;
SI C > 10 ENTONCES
  ESCRIBIR "La suma es", C, "y si pasa de 10";
SINO
  ESCRIBIR "La suma es", C, "y no pasa de 10";
FIN_SI;
FIN;`,

"2. Tabla de multiplicar": `INICIO;
LEER N;
I = 1;
MIENTRAS I <= 10 HACER
  ESCRIBIR N, "x", I, "=", N * I;
  I = I + 1;
FIN_MIENTRAS;
FIN;`,

"3. Error semantico a proposito": `INICIO;
LEER PRECIO;
TOTAL = PRECIO * CANTIDAD;
ESCRIBIR "Total a pagar:", TOTAL;
FIN;`,
};

for (const [nombre, codigo] of Object.entries(ejemplos)) {
  console.log("\n########## " + nombre + " ##########");
  try {
    const toks = ctx.simpleLexer(codigo).filter(t => t.type !== "EOL");
    const ast = new ctx.Parser(toks).parseProgram();
    const sem = ctx.semanticAnalyze(ast);
    const js  = ctx.translateASTtoJS(ast);
    console.log("sintaxis : OK (" + toks.length + " tokens)");
    console.log("semantica: " + (sem.issues.length ? sem.issues.map(i => i.msg).join(" / ") : "sin observaciones"));
    console.log("--- JS generado ---");
    console.log(js);
  } catch (e) {
    console.log("FALLA: " + (e.msg || e.message || e));
  }
}
