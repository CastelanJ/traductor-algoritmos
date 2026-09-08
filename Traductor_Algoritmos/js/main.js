/* ---------------------------
   LOGIN HANDLER
   --------------------------- */

(function() {
  const VALID_USER = "admin";
  const VALID_PASS = "1234";

  const form = document.getElementById("loginForm");
  const card = document.getElementById("loginCard");
  const overlay = document.getElementById("loginOverlay");
  const errorMsg = document.getElementById("loginError");
  const appContent = document.getElementById("appContent");

  form.addEventListener("submit", function(e) {
    e.preventDefault();
    const user = document.getElementById("loginUser").value.trim();
    const pass = document.getElementById("loginPass").value;

    if (user === VALID_USER && pass === VALID_PASS) {
      // Success — fade out login, reveal app
      errorMsg.classList.remove("visible");
      overlay.classList.add("fade-out");

      setTimeout(function() {
        overlay.style.display = "none";
        appContent.classList.add("visible");
      }, 600);
    } else {
      // Failure — shake card and show error
      errorMsg.classList.add("visible");
      card.classList.remove("shake");
      // Force reflow to restart animation
      void card.offsetWidth;
      card.classList.add("shake");
    }
  });

  // Allow Enter key to submit (already handled by form, but ensure focus)
  document.getElementById("loginUser").addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("loginPass").focus();
    }
  });
})();

/* ---------------------------
   UI bindings, helpers and orchestration
   --------------------------- */

function displayError(err) {
  const eDiv = document.getElementById("errInner");
  if (!err) { eDiv.innerHTML = "<em>Sin errores.</em>"; return; }
  let text = "";
  if (err.token) text = `<div class="error">${escapeHtml(err.msg)}</div><div style="font-size:12px;color:var(--muted)">Token: ${escapeHtml(err.token.type + ' ' + (err.token.value || ''))} (línea ${err.token.line || '?'})</div>`;
  else text = `<div class="error">${escapeHtml(err.msg || err)}</div>`;
  eDiv.innerHTML = text;

  try {
    if (err.token && err.token.line) {
      highlightLine(err.token.line);
    }
  } catch (e) {}
}

function escapeHtml(s) {
  return (s + "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function analizarLexico() {
  const src = document.getElementById("inputCode").value;
  const toks = simpleLexer(src);
  const body = toks.map((t, i) => `<div class="tokens-row"><div><strong>${i + 1}.</strong> ${t.type}</div><div style="color:var(--muted)">${escapeHtml(t.value || "")}</div><div style="color:var(--muted)">${t.line}</div></div>`).join("");
  document.getElementById("tokensInner").innerHTML = body || "<em>Sin tokens</em>";
  document.getElementById("stats").textContent = "Líneas: " + (src.replace(/\r/g, '').split('\n').length);
  document.getElementById("errInner").innerHTML = "<em>Analizado léxicamente.</em>";
  return toks;
}

function parseAndBuildAST() {
  const src = document.getElementById("inputCode").value;
  try {
    const toks = simpleLexer(src).filter(t => t.type !== "EOL");
    const p = new Parser(toks);
    const ast = p.parseProgram();
    renderAST(document.getElementById("astSVG"), ast);
    document.getElementById("errInner").innerHTML = "<span class='success'>Análisis sintáctico: OK</span>";
    document.getElementById("translationInner").textContent = "<sin traducir>";
    document.getElementById("semanticInner").innerHTML = "<em>Sin análisis semántico.</em>";
    return ast;
  } catch (e) {
    displayError(e);
    return null;
  }
}

function semanticCheck() {
  const ast = parseAndBuildAST();
  if (!ast) return;
  const res = semanticAnalyze(ast);
  if (res.issues.length === 0) {
    document.getElementById("semanticInner").innerHTML = "<span class='success'>Sin problemas semánticos detectados.</span>";
  } else {
    const html = res.issues.map(x => `<div class="error">• ${escapeHtml(x.msg)}</div>`).join("");
    document.getElementById("semanticInner").innerHTML = html;
  }
  return res;
}

function translateToJS() {
  const ast = parseAndBuildAST();
  if (!ast) return;
  const js = translateASTtoJS(ast);
  document.getElementById("translationInner").textContent = js || "// Sin instrucciones traducibles";
  return js;
}

/* Ejecutar: captura console.log y muestra en panel */
function executeTranslated() {
  const js = translateToJS();
  if (!js) return;
  try {
    const wrapped = `(function(){\n${js}\n})();`;
    const oldLog = console.log;
    let out = [];
    console.log = function(...a) { out.push(a.join(" ")); oldLog.apply(console, a); };
    new Function(wrapped)();
    console.log = oldLog;
    const outDiv = document.getElementById("runOutput");
    if (out.length > 0) {
      outDiv.innerHTML = out.map(s => `<div>${escapeHtml(s)}</div>`).join("");
    } else {
      outDiv.innerHTML = "<em>Ejecución completada (sin salida). Revisa la consola para más detalles.</em>";
    }
    document.getElementById("errInner").innerHTML = "<span class='success'>Ejecución completada ✔️</span>";
  } catch (e) {
    alert("Error al ejecutar el JS generado:\n" + e);
  }
}

/* Orchestration */
function runAll() {
  try {
    analizarLexico();
    const ast = parseAndBuildAST();
    if (!ast) return;
    semanticCheck();
    translateToJS();
  } catch (e) {
    displayError(e);
  }
}

/* Save / Load */
document.getElementById("saveBtn").addEventListener("click", () => {
  const content = document.getElementById("inputCode").value;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "programa.alg";
  a.click();
});

document.getElementById("fileIn").addEventListener("change", (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById("inputCode").value = e.target.result;
    analizarLexico();
  };
  reader.readAsText(f);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("¿Limpiar editor?")) { 
    document.getElementById("inputCode").value = ""; 
    document.getElementById("tokensInner").innerHTML = "";
    document.getElementById("astSVG").innerHTML = "";
    document.getElementById("translationInner").textContent = "<sin traducir>";
    document.getElementById("errInner").innerHTML = "<em>Sin análisis.</em>";
    document.getElementById("semanticInner").innerHTML = "<em>Sin análisis semántico.</em>";
    document.getElementById("stats").textContent = "Líneas: 0";
    document.getElementById("runOutput").innerHTML = "<em>Sin ejecución.</em>";
  }
});

/* Download translation */
function downloadTranslation() {
  const js = document.getElementById("translationInner").textContent;
  const blob = new Blob([js], { type: "text/javascript;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "programa_traducido.js";
  a.click();
}

function copyTranslation() {
  const js = document.getElementById("translationInner").textContent;
  navigator.clipboard.writeText(js).then(() => alert("Traducción copiada al portapapeles."));
}

/* Highlight line in textarea */
function highlightLine(lineNumber) {
  const ta = document.getElementById("inputCode");
  const lines = ta.value.replace(/\r/g, '').split('\n');
  if (lineNumber < 1 || lineNumber > lines.length) return;
  let start = 0;
  for (let i = 0; i < lineNumber - 1; i++) start += lines[i].length + 1;
  ta.focus();
  ta.setSelectionRange(start, start + lines[lineNumber - 1].length);
}

/* Theme toggle */
document.getElementById("themeToggle").addEventListener("click", () => {
  const el = document.body;
  const current = el.getAttribute("data-theme") || "light";
  el.setAttribute("data-theme", current === "light" ? "dark" : "light");
});

/* Initial demo content */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("inputCode").value = `INICIO;
LEER A, B;
C = A + B;
SI C > 10 ENTONCES
  ESCRIBIR "La suma es mayor a 10: ", C;
SINO
  ESCRIBIR "La suma es menor o igual a 10: ", C;
FIN_SI;
FIN;`;
  analizarLexico();
});
