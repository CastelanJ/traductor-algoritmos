/* ---------------------------
  AST Visualization (layout SVG)
  --------------------------- */

function renderAST(svgEl, node) {
  svgEl.innerHTML = "";
  if (!node) return;
  const padding = 20;
  const nodeW = 140;
  const nodeH = 34;
  const levelGap = 70;
  const siblingGap = 18;

  const layers = [];
  function traverse(n, depth) {
    if (!layers[depth]) layers[depth] = [];
    layers[depth].push(n);
    const kids = [];
    if (n.type === "Program" || n.type === "Statements") { n.children.forEach(c => kids.push(c)); }
    else if (n.type === "Read" || n.type === "Write" || n.type === "Assign") { 
      if (n.vars) kids.push(...n.vars.map(v => makeNode("Identifier", { name: v }))); 
      if (n.expr) {
        if (n.expr.type === "ExpressionList") {
          kids.push(...n.expr.expressions);
        } else {
          kids.push(n.expr);
        }
      }
    }
    else if (n.type === "If") { kids.push(n.cond); kids.push(n.thenBlock); if (n.elseBlock) kids.push(n.elseBlock); }
    else if (n.type === "While") { kids.push(n.cond); kids.push(n.body); }
    else if (n.type === "Repeat") { kids.push(n.body); kids.push(n.cond); }
    else {
      if (n.left) kids.push(n.left);
      if (n.right) kids.push(n.right);
      if (n.child) kids.push(n.child);
    }
    n._kids = kids;
    for (let k of kids) traverse(k, depth + 1);
  }
  traverse(node, 0);

  const positions = new Map();
  const widthPerLevel = [];
  for (let d = 0; d < layers.length; d++) {
    const arr = layers[d];
    let startX = padding;
    for (let i = 0; i < arr.length; i++) {
      const n = arr[i];
      positions.set(n, { x: startX + i * (nodeW + siblingGap), y: padding + d * (nodeH + levelGap) });
    }
    widthPerLevel[d] = startX + arr.length * (nodeW + siblingGap);
  }

  const svgW = Math.max(...widthPerLevel) + padding;
  const svgH = (layers.length) * (nodeH + levelGap) + padding;
  svgEl.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
  svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // connectors
  for (const [n, pos] of positions.entries()) {
    if (n._kids) {
      for (const kid of n._kids) {
        if (!positions.has(kid)) continue;
        const kp = positions.get(kid);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", pos.x + nodeW / 2);
        line.setAttribute("y1", pos.y + nodeH);
        line.setAttribute("x2", kp.x + nodeW / 2);
        line.setAttribute("y2", kp.y);
        line.setAttribute("stroke", "#aac9ff");
        line.setAttribute("stroke-width", "2");
        svgEl.appendChild(line);
      }
    }
  }

  // draw nodes
  for (const [n, pos] of positions.entries()) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const rx = pos.x, ry = pos.y;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", rx);
    rect.setAttribute("y", ry);
    rect.setAttribute("width", nodeW);
    rect.setAttribute("height", nodeH);
    rect.setAttribute("rx", 8);
    rect.setAttribute("fill", "#fff");
    rect.setAttribute("stroke", "#0a4fa3");
    rect.setAttribute("stroke-width", "1.5");
    g.appendChild(rect);
    const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", rx + 8);
    txt.setAttribute("y", ry + 20);
    txt.setAttribute("font-size", 12);
    txt.setAttribute("fill", "#0a4fa3");
    txt.textContent = nodeLabel(n);
    g.appendChild(txt);
    svgEl.appendChild(g);
  }
}

function nodeLabel(n) {
  if (!n) return "";
  if (n.type === "Program") return "Programa";
  if (n.type === "Statements") return "Bloque";
  if (n.type === "Read") return "Leer: " + (n.vars ? n.vars.join(",") : "");
  if (n.type === "Write") return "Escribir";
  if (n.type === "Assign") return "Asignar: " + n.id;
  if (n.type === "If") return "Si";
  if (n.type === "While") return "Mientras";
  if (n.type === "Repeat") return "Repetir";
  if (n.type === "BinaryOp") return n.op;
  if (n.type === "UnaryOp") return "Unary " + (n.op || "");
  if (n.type === "Identifier") return "Id: " + n.name;
  if (n.type === "Number") return "Num: " + n.value;
  if (n.type === "String") return "Cad: \"" + n.value + "\"";
  if (n.type === "ExpressionList") return "Lista Expr";
  return n.type || "Node";
}
