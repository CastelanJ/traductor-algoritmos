/* Acceso: valida contra /api/login. */

(function() {
  const form = document.getElementById("loginForm");
  const card = document.getElementById("loginCard");
  const overlay = document.getElementById("loginOverlay");
  const errorMsg = document.getElementById("loginError");
  const appContent = document.getElementById("appContent");

  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    const user = document.getElementById("loginUser").value.trim();
    const pass = document.getElementById("loginPass").value;

    const btn = document.getElementById("loginBtn");
    const btnLabel = btn.querySelector(".label") || btn;
    btn.disabled = true;
    btnLabel.textContent = "Verificando";

    // Se valida contra la base de datos en Neon, no contra constantes locales.
    let ok = false;
    let motivo = "Usuario o contraseña incorrectos";
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: user, password: pass })
      });
      const data = await res.json();
      ok = res.ok && data.ok === true;
      if (ok) {
        window.USUARIO_ACTUAL = data.usuario;
      } else if (res.status >= 500) {
        // No es culpa de las credenciales: el servidor o la base fallaron.
        motivo = "Error del servidor: " + (data.error || res.status);
      } else if (data.error) {
        motivo = data.error;
      }
    } catch (err) {
      console.error("No se pudo contactar al servidor:", err);
      motivo = "No se pudo contactar al servidor. ¿Esta corriendo npm run dev?";
      ok = false;
    }
    errorMsg.textContent = motivo;

    btn.disabled = false;
    btnLabel.textContent = "Iniciar sesion";

    if (ok) {
      // Success — fade out login, reveal app
      errorMsg.classList.remove("visible");
      overlay.classList.add("fade-out");

      setTimeout(function() {
        overlay.style.display = "none";
        appContent.classList.add("visible");
        cargarHistorial();
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

/* Interfaz: enlaza los botones y orquesta las fases. */

function displayError(err) {
  const eDiv = document.getElementById("errInner");
  if (!err) { eDiv.innerHTML = '<p class="empty">Sin errores.</p>'; return; }
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
  toks.filter(t => t.type === "UNKNOWN").forEach(t =>
    anotarError("lexico", "Caracter no reconocido: " + t.value, t.line, t.value));
  const body = toks.map((t, i) => `<div class="tokens-row"><div><strong>${i + 1}.</strong> ${t.type}</div><div style="color:var(--muted)">${escapeHtml(t.value || "")}</div><div style="color:var(--muted)">${t.line}</div></div>`).join("");
  document.getElementById("tokensInner").innerHTML = body || '<p class="empty">Sin tokens.</p>';
  document.getElementById("stats").textContent = "Líneas: " + (src.replace(/\r/g, '').split('\n').length);
  document.getElementById("errInner").innerHTML = '<span class="success">Analisis lexico completado.</span>';
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
    document.getElementById("translationInner").textContent = "Sin traduccion.";
    document.getElementById("semanticInner").innerHTML = '<p class="empty">Sin analisis semantico.</p>';
    return ast;
  } catch (e) {
    displayError(e);
    anotarError(
      "sintactico",
      e.msg || e.message || e,
      e.token ? e.token.line : null,
      e.token ? (e.token.type + " " + (e.token.value || "")) : null
    );
    return null;
  }
}

/* Llena el panel semantico a partir de un AST ya construido. */
function mostrarSemantico(ast) {
  const res = semanticAnalyze(ast);
  res.issues.forEach(x => anotarError("semantico", x.msg));
  const div = document.getElementById("semanticInner");
  if (res.issues.length === 0) {
    div.innerHTML = "<span class='success'>Sin problemas semanticos detectados.</span>";
  } else {
    div.innerHTML = res.issues.map(x => `<div class="error">${escapeHtml(x.msg)}</div>`).join("");
  }
  return res;
}

/* Boton "Semantico": parsea y muestra. */
function semanticCheck() {
  const ast = parseAndBuildAST();
  if (!ast) return;
  return mostrarSemantico(ast);
}

/* Llena el panel de traduccion a partir de un AST ya construido. */
function mostrarTraduccion(ast) {
  const js = translateASTtoJS(ast);
  document.getElementById("translationInner").textContent = js || "// Sin instrucciones traducibles.";
  return js;
}

/* Boton "Traducir": parsea y muestra. */
function translateToJS() {
  const ast = parseAndBuildAST();
  if (!ast) return;
  return mostrarTraduccion(ast);
}

/* Ejecutar: captura console.log y muestra en panel */
function executeTranslated() {
  ERRORES_PENDIENTES = [];
  const ast = parseAndBuildAST();
  if (!ast) return;
  mostrarSemantico(ast);
  const js = mostrarTraduccion(ast);
  if (!js) return;

  const outDiv = document.getElementById("runOutput");
  const oldLog = console.log;
  const out = [];
  console.log = function(...a) { out.push(a.join(" ")); oldLog.apply(console, a); };

  let fallo = null;
  try {
    const salto = String.fromCharCode(10);
    new Function("(function(){" + salto + js + salto + "})();")();
  } catch (e) {
    fallo = e;
  } finally {
    // Se restaura siempre, aunque el programa traducido haya fallado.
    console.log = oldLog;
  }

  if (out.length > 0) {
    outDiv.innerHTML = out.map(s => `<div>${escapeHtml(s)}</div>`).join("");
  } else if (!fallo) {
    outDiv.innerHTML = '<p class="empty">Ejecucion completada sin salida.</p>';
  }

  if (fallo) {
    anotarError("ejecucion", fallo.message || fallo);
    const msg = escapeHtml(fallo.message || fallo);
    outDiv.innerHTML += `<div class="error">Error en tiempo de ejecucion: ${msg}</div>`;
    document.getElementById("errInner").innerHTML = `<div class="error">La ejecucion fallo: ${msg}</div>`;
  } else {
    document.getElementById("errInner").innerHTML = "<span class='success'>Ejecucion completada.</span>";
  }

  enviarPendientes(js, !fallo);
}

/* Orchestration */
function runAll() {
  ERRORES_PENDIENTES = [];
  try {
    analizarLexico();
    // Se parsea una sola vez; antes cada paso reparseaba y el ultimo
    // borraba el resultado semantico que el anterior acababa de escribir.
    const ast = parseAndBuildAST();
    if (!ast) { enviarPendientes(null, false); return; }
    mostrarSemantico(ast);
    const js = mostrarTraduccion(ast);
    enviarPendientes(js, true);
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
    document.getElementById("translationInner").textContent = "Sin traduccion.";
    document.getElementById("errInner").innerHTML = '<p class="empty">Sin analisis.</p>';
    document.getElementById("semanticInner").innerHTML = '<p class="empty">Sin analisis semantico.</p>';
    document.getElementById("stats").textContent = "Líneas: 0";
    document.getElementById("runOutput").innerHTML = '<p class="empty">Sin ejecucion.</p>';
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

/* Historial en la base de datos.
   Guarda programas y registra cada traduccion y cada error detectado. */

let PROGRAMA_ACTUAL = null;      // { id, titulo } del programa abierto
let ERRORES_PENDIENTES = [];     // errores de la corrida en curso

function usuarioId() {
  return window.USUARIO_ACTUAL ? window.USUARIO_ACTUAL.id : null;
}

function aviso(texto, esError) {
  const p = document.getElementById("avisoHistorial");
  if (!p) return;
  p.textContent = texto || "";
  p.className = "aviso" + (esError ? " error-texto" : "");
}

/* Apunta un error para mandarlo despues, junto con los demas de la corrida. */
function anotarError(fase, mensaje, linea, token) {
  ERRORES_PENDIENTES.push({
    fase: fase,
    mensaje: String(mensaje || ""),
    linea: linea || null,
    token: token || null
  });
}

/* Manda a la base la traduccion y los errores acumulados.
   Solo funciona si hay un programa guardado: las tablas traducciones y
   errores exigen un programa_id que exista. */
async function enviarPendientes(codigoJs, exitosa) {
  if (!PROGRAMA_ACTUAL) {
    ERRORES_PENDIENTES = [];
    return;
  }

  const pendientes = ERRORES_PENDIENTES;
  ERRORES_PENDIENTES = [];

  try {
    await fetch("/api/traducciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programa_id: PROGRAMA_ACTUAL.id,
        codigo_js: codigoJs || null,
        exitosa: exitosa
      })
    });

    if (pendientes.length > 0) {
      await fetch("/api/errores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programa_id: PROGRAMA_ACTUAL.id, errores: pendientes })
      });
    }

    cargarHistorial();
  } catch (e) {
    console.error("No se pudo registrar el historial:", e);
  }
}

/* Guarda el contenido del editor en la base. */
async function guardarEnBase() {
  const uid = usuarioId();
  if (!uid) { aviso("Inicia sesion para guardar.", true); return; }

  const codigo = document.getElementById("inputCode").value.trim();
  if (!codigo) { aviso("El editor esta vacio.", true); return; }

  const campo = document.getElementById("tituloPrograma");
  const titulo = campo.value.trim() || "Programa sin titulo";

  const boton = document.getElementById("btnGuardarBase");
  boton.disabled = true;

  try {
    const res = await fetch("/api/programas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario_id: uid,
        titulo: titulo,
        codigo: codigo,
        id: PROGRAMA_ACTUAL ? PROGRAMA_ACTUAL.id : undefined
      })
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      aviso(data.error || "No se pudo guardar.", true);
      return;
    }

    PROGRAMA_ACTUAL = { id: data.programa.id, titulo: data.programa.titulo };
    campo.value = data.programa.titulo;
    aviso(data.creado ? "Guardado como programa nuevo." : "Cambios guardados.", false);
    cargarHistorial();
  } catch (e) {
    aviso("No se pudo contactar al servidor.", true);
  } finally {
    boton.disabled = false;
  }
}

/* Trae la lista de programas del usuario y la pinta. */
async function cargarHistorial() {
  const uid = usuarioId();
  const lista = document.getElementById("listaProgramas");
  if (!uid || !lista) return;

  try {
    const res = await fetch("/api/programas?usuario_id=" + uid);
    const data = await res.json();

    if (!data.ok || data.programas.length === 0) {
      lista.innerHTML = '<p class="empty">Aun no has guardado programas.</p>';
      return;
    }

    lista.innerHTML = data.programas.map(function (p) {
      const activo = PROGRAMA_ACTUAL && PROGRAMA_ACTUAL.id === p.id ? " activo" : "";
      const fecha = new Date(p.modificado_en).toLocaleString("es-MX", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
      });
      return '<div class="prog' + activo + '">' +
        '<button class="prog-abrir" onclick="abrirPrograma(' + p.id + ')">' +
          '<span class="prog-titulo">' + escapeHtml(p.titulo) + '</span>' +
          '<span class="prog-meta">' + fecha +
            ' &middot; ' + p.num_traducciones + ' traducciones' +
            ' &middot; ' + p.num_errores + ' errores</span>' +
        '</button>' +
        '<button class="btn btn-icon" title="Eliminar" aria-label="Eliminar" ' +
          'onclick="borrarPrograma(' + p.id + ')">' +
          '<span class="material-symbols-outlined">delete</span></button>' +
      '</div>';
    }).join("");
  } catch (e) {
    lista.innerHTML = '<p class="empty">No se pudo cargar la lista.</p>';
  }
}

/* Carga un programa guardado en el editor. */
async function abrirPrograma(id) {
  const uid = usuarioId();
  if (!uid) return;

  try {
    const res = await fetch("/api/programas?usuario_id=" + uid);
    const data = await res.json();
    const p = (data.programas || []).find(function (x) { return x.id === id; });
    if (!p) { aviso("No se encontro el programa.", true); return; }

    document.getElementById("inputCode").value = p.codigo;
    document.getElementById("tituloPrograma").value = p.titulo;
    PROGRAMA_ACTUAL = { id: p.id, titulo: p.titulo };
    aviso('Abierto: "' + p.titulo + '". Lo que analices se registrara aqui.', false);
    analizarLexico();
    cargarHistorial();
  } catch (e) {
    aviso("No se pudo abrir el programa.", true);
  }
}

/* Borra un programa; sus traducciones y errores se van en cascada. */
async function borrarPrograma(id) {
  const uid = usuarioId();
  if (!uid) return;
  if (!confirm("Se borrara el programa junto con sus traducciones y errores. Continuar?")) return;

  try {
    const res = await fetch("/api/programas?id=" + id + "&usuario_id=" + uid, { method: "DELETE" });
    const data = await res.json();
    if (!data.ok) { aviso(data.error || "No se pudo borrar.", true); return; }

    if (PROGRAMA_ACTUAL && PROGRAMA_ACTUAL.id === id) {
      PROGRAMA_ACTUAL = null;
      document.getElementById("tituloPrograma").value = "";
    }
    aviso("Programa eliminado.", false);
    cargarHistorial();
  } catch (e) {
    aviso("No se pudo contactar al servidor.", true);
  }
}
