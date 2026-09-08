/* ---------------------------
   LEXER: tokeniza el texto,
   llevamos posición y línea
   --------------------------- */

const KEYWORDS = ["INICIO", "FIN", "LEER", "ESCRIBIR", "SI", "ENTONCES", "SINO", "FIN_SI",
                  "MIENTRAS", "HACER", "FIN_MIENTRAS", "PARA", "FIN_PARA", "REPETIR", "HASTA"];
const OPERATORS = ["==", "<=", ">=", "!=", "=", "+", "-", "*", "/", "<", ">"];
const SYMBOLS = [";", ",", "(", ")"];

function simpleLexer(source) {
  const tokens = [];
  const lines = source.replace(/\r/g, '').split('\n');
  for (let ln = 0; ln < lines.length; ln++) {
    let line = lines[ln];
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      // skip spaces
      if (/\s/.test(ch)) { i++; continue; }
      // comments: // to end
      if (ch === "/" && line[i + 1] === "/") { break; }
      // strings "...' or '...'
      if (ch === '"' || ch === "'") {
        const q = ch;
        let j = i + 1; let val = "";
        while (j < line.length && line[j] !== q) { val += line[j++]; }
        tokens.push({ type: "STRING", value: val, line: ln + 1 });
        i = j + 1; continue;
      }
      // multi-char operators (==, <=, >=, !=)
      let two = line.substr(i, 2);
      if (OPERATORS.includes(two)) {
        tokens.push({ type: "OP", value: two, line: ln + 1 }); i += 2; continue;
      }
      // single char operators
      if (OPERATORS.includes(ch)) {
        tokens.push({ type: "OP", value: ch, line: ln + 1 }); i++; continue;
      }
      // symbols like ; , ( )
      if (SYMBOLS.includes(ch)) {
        tokens.push({ type: "SYM", value: ch, line: ln + 1 }); i++; continue;
      }
      // numbers
      if (/\d/.test(ch)) {
        let j = i; let num = "";
        while (j < line.length && /[\d\.]/.test(line[j])) { num += line[j++]; }
        tokens.push({ type: "NUMBER", value: num, line: ln + 1 }); i = j; continue;
      }
      // identifiers / keywords / words (allow underscore and letters)
      if (/[A-Za-z_]/.test(ch)) {
        let j = i; let id = "";
        while (j < line.length && /[A-Za-z0-9_\-]/.test(line[j])) { id += line[j++]; }
        const up = id.toUpperCase();
        if (KEYWORDS.includes(up)) {
          tokens.push({ type: "KW", value: up, line: ln + 1 });
        } else {
          tokens.push({ type: "ID", value: id, line: ln + 1 });
        }
        i = j; continue;
      }
      // unknown char
      tokens.push({ type: "UNKNOWN", value: ch, line: ln + 1 });
      i++;
    }
    // newline token
    tokens.push({ type: "EOL", value: "", line: ln + 1 });
  }
  return tokens;
}
