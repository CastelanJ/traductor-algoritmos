import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const FASES = ["lexico", "sintactico", "semantico", "ejecucion"];

/**
 * GET /api/errores?programa_id=1
 * Errores registrados de un programa.
 *
 * GET /api/errores?usuario_id=1&resumen=1
 * Conteo por fase de todos los programas de un usuario.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const programaId = Number(params.get("programa_id"));
  const usuarioId = Number(params.get("usuario_id"));
  const resumen = params.get("resumen") === "1";

  try {
    if (resumen && usuarioId) {
      const porFase = await sql`
        SELECT e.fase, COUNT(*)::int AS total
        FROM errores e
        JOIN programas p ON p.id = e.programa_id
        WHERE p.usuario_id = ${usuarioId}
        GROUP BY e.fase
        ORDER BY total DESC
      `;
      return NextResponse.json({ ok: true, porFase });
    }

    if (!programaId) {
      return NextResponse.json({ ok: false, error: "Falta programa_id" }, { status: 400 });
    }

    const errores = await sql`
      SELECT id, fase, mensaje, linea, token, creado_en
      FROM errores
      WHERE programa_id = ${programaId}
      ORDER BY creado_en DESC
      LIMIT 100
    `;
    return NextResponse.json({ ok: true, errores });
  } catch (error) {
    console.error("Error en GET /api/errores:", error);
    return NextResponse.json({ ok: false, error: "Error del servidor" }, { status: 500 });
  }
}

/**
 * POST /api/errores
 * Registra uno o varios errores de golpe.
 * Body: { programa_id, errores: [{ fase, mensaje, linea?, token? }] }
 */
export async function POST(req: Request) {
  try {
    const { programa_id, errores } = await req.json();

    if (!programa_id || !Array.isArray(errores) || errores.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Faltan programa_id o la lista de errores" },
        { status: 400 }
      );
    }

    let guardados = 0;
    for (const e of errores.slice(0, 50)) {
      // La columna tiene un CHECK con estas cuatro fases; se filtra antes
      // de insertar para no provocar un error de restriccion.
      if (!FASES.includes(e.fase)) continue;

      await sql`
        INSERT INTO errores (programa_id, fase, mensaje, linea, token)
        VALUES (
          ${programa_id},
          ${e.fase},
          ${String(e.mensaje ?? "").slice(0, 2000)},
          ${e.linea ?? null},
          ${e.token ? String(e.token).slice(0, 100) : null}
        )
      `;
      guardados++;
    }

    return NextResponse.json({ ok: true, guardados }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/errores:", error);
    return NextResponse.json({ ok: false, error: "Error del servidor" }, { status: 500 });
  }
}
