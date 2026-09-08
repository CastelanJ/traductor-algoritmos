import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

// Esta ruta consulta la base en cada peticion; nunca se pre-genera.
export const dynamic = "force-dynamic";

/**
 * POST /api/login
 * Reemplaza el usuario y contraseña que estaban escritos a mano en main.js.
 * Body: { usuario: string, password: string }
 */
export async function POST(req: Request) {
  let usuario = "";
  let password = "";

  try {
    const body = await req.json();
    usuario = String(body.usuario ?? "").trim();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Petición inválida" },
      { status: 400 }
    );
  }

  if (!usuario || !password) {
    return NextResponse.json(
      { ok: false, error: "Usuario y contraseña son obligatorios" },
      { status: 400 }
    );
  }

  // IP de quien intenta entrar; queda en la bitácora de sesiones.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  try {
    const filas = await sql`
      SELECT id, usuario, nombre, rol, password_hash
      FROM usuarios
      WHERE usuario = ${usuario} AND activo = TRUE
    `;

    const u = filas[0];

    // bcrypt.compare vuelve a hashear lo tecleado con la misma sal guardada
    // y compara los resultados. La contraseña original nunca se recupera.
    const ok = u ? await bcrypt.compare(password, u.password_hash) : false;

    // Se registra SIEMPRE, tanto el acierto como el fallo.
    // usuario_id queda NULL si intentaron entrar con un usuario inexistente.
    await sql`
      INSERT INTO sesiones (usuario_id, ip_origen, exitoso)
      VALUES (${u?.id ?? null}, ${ip}, ${ok})
    `;

    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      usuario: { id: u.id, usuario: u.usuario, nombre: u.nombre, rol: u.rol },
    });
  } catch (error) {
    console.error("Error en /api/login:", error);
    return NextResponse.json(
      { ok: false, error: "Error del servidor" },
      { status: 500 }
    );
  }
}
