import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const sql = neon(process.env.DATABASE_URL);

const filas = await sql`
  SELECT id, usuario, activo, password_hash
  FROM usuarios ORDER BY id
`;

console.log("Usuarios encontrados:", filas.length);
console.log("");

const pruebas = { admin: "1234", alumno: "alumno123" };

for (const u of filas) {
  const h = u.password_hash ?? "";
  console.log(`id=${u.id}  usuario="${u.usuario}"  activo=${u.activo}`);
  console.log(`   hash: prefijo="${h.slice(0, 7)}"  largo=${h.length}`);

  const clave = pruebas[u.usuario];
  if (clave) {
    try {
      const ok = await bcrypt.compare(clave, h);
      console.log(`   bcrypt.compare("${clave}", hash) => ${ok ? "CORRECTO" : "FALLA"}`);
    } catch (e) {
      console.log(`   bcrypt.compare lanzo error: ${e.message}`);
    }
    const [{ pg }] = await sql`
      SELECT (password_hash = crypt(${clave}, password_hash)) AS pg
      FROM usuarios WHERE id = ${u.id}
    `;
    console.log(`   verificacion con pgcrypto        => ${pg ? "CORRECTO" : "FALLA"}`);
  }
  console.log("");
}
