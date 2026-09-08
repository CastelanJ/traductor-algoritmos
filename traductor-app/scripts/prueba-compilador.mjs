import fs from "node:fs";
import vm from "node:vm";

const base = "../public/traductor/js/";
const fuentes = ["lexer.js", "parser.js", "semantic.js", "translator.js"]
  .map(f => fs.readFileSync(base + f, "utf8")).join("\n");

const ctx = vm.createContext({ console });
vm.runInContext(fuentes, ctx);

const casos = {
  "SI/SINO con punto y coma (el ejemplo de la app)": `INICIO;
LEER A, B;
C = A + B;
SI C > 10 ENTONCES
  ESCRIBIR "mayor: ", C;
SINO
  ESCRIBIR "menor: ", C;
FIN_SI;
FIN;`,
  "MIENTRAS con punto y coma": `INICIO;
LEER N;
I = 0;
MIENTRAS I < N HACER
  ESCRIBIR I;
  I = I + 1;
FIN_MIENTRAS;
FIN;`,
  "REPETIR / HASTA": `INICIO;
I = 0;
REPETIR
  ESCRIBIR I;
  I = I + 1;
HASTA I > 3;
FIN;`,
  "Variable usada antes de definirse (debe avisar)": `INICIO;
D = X + 1;
ESCRIBIR D;
FIN;`,
  "Ciclo PARA": `INICIO;
PARA I = 1 HASTA 5 HACER
  ESCRIBIR I;
FIN_PARA;
FIN;`,
};

for (const [nombre, codigo] of Object.entries(casos)) {
  process.stdout.write("\n### " + nombre + "\n");
  try {
    const toks = ctx.simpleLexer(codigo).filter(t => t.type !== "EOL");
    const ast = new ctx.Parser(toks).parseProgram();
    const sem = ctx.semanticAnalyze(ast);
    const js = ctx.translateASTtoJS(ast);
    console.log("  sintaxis  : OK");
    console.log("  semantica : " + (sem.issues.length ? sem.issues.map(i => i.msg).join(" | ") : "sin observaciones"));
    console.log("  traduccion: " + (js ? js.split("\n").length + " lineas de JS" : "VACIA"));
  } catch (e) {
    console.log("  FALLA: " + (e.msg || e.message || e));
  }
}
