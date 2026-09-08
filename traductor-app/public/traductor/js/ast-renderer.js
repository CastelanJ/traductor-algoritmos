/* Dibujo del AST en SVG.
   Layout tipo "tidy tree": las hojas se colocan de izquierda a derecha
   y cada padre se centra sobre sus hijos. Antes cada nivel se dibujaba
   independiente del anterior, asi que las lineas se cruzaban.
   Los colores salen de las clases CSS (.ast-node, .ast-link) para que
   el arbol siga al tema claro/oscuro. */

const SVG_NS = "http://www.w3.org/2000/svg";

function renderAST(svgEl, raiz) {
  svgEl.innerHTML = "";
  if (!raiz) return;

  const ALTO_NODO = 26;
  const SEPARACION_NIVEL = 54;   // vertical, entre niveles
  const SEPARACION_HERMANOS = 14; // horizontal, entre nodos vecinos
  const MARGEN = 14;

  /* 1. Determinar los hijos de cada nodo del AST */
  function hijosDe(n) {
    if (n.type === "Program" || n.type === "Statements") return n.children || [];
    if (n.type === "Read") {
      return (n.vars || []).map(v => makeNode("Identifier", { name: v }));
    }
    if (n.type === "Write" || n.type === "Assign") {
      if (!n.expr) return [];
      return n.expr.type === "ExpressionList" ? n.expr.expressions : [n.expr];
    }
    if (n.type === "If") {
      const k = [n.cond, n.thenBlock];
      if (n.elseBlock) k.push(n.elseBlock);
      return k;
    }
    if (n.type === "While") return [n.cond, n.body];
    if (n.type === "Repeat") return [n.body, n.cond];
    const k = [];
    if (n.left) k.push(n.left);
    if (n.right) k.push(n.right);
    if (n.child) k.push(n.child);
    return k;
  }

  /* 2. Medir cada nodo segun su etiqueta */
  function anchoDe(texto) {
    return Math.max(64, Math.min(190, texto.length * 6.4 + 18));
  }

  /* 3. Calcular posiciones (post-orden) */
  const nodos = [];
  let cursorX = MARGEN;

  function colocar(n, profundidad) {
    const etiqueta = nodeLabel(n);
    const ancho = anchoDe(etiqueta);
    const hijos = hijosDe(n).filter(Boolean);
    const y = MARGEN + profundidad * (ALTO_NODO + SEPARACION_NIVEL);

    let centro;
    if (hijos.length === 0) {
      centro = cursorX + ancho / 2;
      cursorX += ancho + SEPARACION_HERMANOS;
    } else {
      const colocados = hijos.map(h => colocar(h, profundidad + 1));
      const primero = colocados[0].centro;
      const ultimo = colocados[colocados.length - 1].centro;
      centro = (primero + ultimo) / 2;

      // Si el padre es mas ancho que el grupo de hijos, se corre el cursor.
      const derecha = centro + ancho / 2 + SEPARACION_HERMANOS;
      if (derecha > cursorX) cursorX = derecha;
    }

    const registro = { nodo: n, etiqueta, ancho, centro, y, hijos, profundidad };
    nodos.push(registro);
    return registro;
  }

  const registroRaiz = colocar(raiz, 0);

  /* 4. Dimensionar el lienzo */
  const anchoTotal = Math.max(cursorX + MARGEN, 240);
  const profundidadMax = Math.max(...nodos.map(r => r.profundidad));
  const altoTotal = MARGEN * 2 + (profundidadMax + 1) * ALTO_NODO + profundidadMax * SEPARACION_NIVEL;

  svgEl.setAttribute("width", anchoTotal);
  svgEl.setAttribute("height", altoTotal);
  svgEl.setAttribute("viewBox", `0 0 ${anchoTotal} ${altoTotal}`);

  const porNodo = new Map(nodos.map(r => [r.nodo, r]));

  /* 5. Conectores (primero, para que queden detras) */
  for (const r of nodos) {
    for (const h of r.hijos) {
      const rh = porNodo.get(h);
      if (!rh) continue;
      const x1 = r.centro, y1 = r.y + ALTO_NODO;
      const x2 = rh.centro, y2 = rh.y;
      const medio = y1 + (y2 - y1) / 2;

      const linea = document.createElementNS(SVG_NS, "path");
      linea.setAttribute("d", `M ${x1} ${y1} V ${medio} H ${x2} V ${y2}`);
      linea.setAttribute("class", "ast-link");
      svgEl.appendChild(linea);
    }
  }

  /* 6. Nodos */
  for (const r of nodos) {
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("class", "ast-node" + (r.nodo === registroRaiz.nodo ? " is-root" : ""));

    const caja = document.createElementNS(SVG_NS, "rect");
    caja.setAttribute("x", r.centro - r.ancho / 2);
    caja.setAttribute("y", r.y);
    caja.setAttribute("width", r.ancho);
    caja.setAttribute("height", ALTO_NODO);
    caja.setAttribute("rx", 3);
    g.appendChild(caja);

    const texto = document.createElementNS(SVG_NS, "text");
    texto.setAttribute("x", r.centro);
    texto.setAttribute("y", r.y + ALTO_NODO / 2);
    texto.setAttribute("text-anchor", "middle");
    texto.setAttribute("dominant-baseline", "central");
    texto.textContent = r.etiqueta;
    g.appendChild(texto);

    const titulo = document.createElementNS(SVG_NS, "title");
    titulo.textContent = r.nodo.type;
    g.appendChild(titulo);

    svgEl.appendChild(g);
  }
}

function nodeLabel(n) {
  if (!n) return "";
  if (n.type === "Program") return "Programa";
  if (n.type === "Statements") return "Bloque";
  if (n.type === "Read") return "Leer " + (n.vars ? n.vars.join(", ") : "");
  if (n.type === "Write") return "Escribir";
  if (n.type === "Assign") return "Asignar " + n.id;
  if (n.type === "If") return "Si";
  if (n.type === "While") return "Mientras";
  if (n.type === "Repeat") return "Repetir";
  if (n.type === "BinaryOp") return n.op;
  if (n.type === "UnaryOp") return (n.op === "NOT" ? "no" : n.op || "unario");
  if (n.type === "Identifier") return n.name;
  if (n.type === "Number") return n.value;
  if (n.type === "String") return '"' + n.value + '"';
  if (n.type === "ExpressionList") return "Lista";
  return n.type || "Nodo";
}
