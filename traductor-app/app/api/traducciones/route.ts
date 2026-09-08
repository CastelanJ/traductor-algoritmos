import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/traducciones?programa_id=1
 * Historial de traducciones de un programa, de la mas reciente a la mas vieja.
 */
export async function GET(req: Request) {
  const programaId = Number(new URL(req.url).searchParams.get("programa_id"));
  if (!programaId) {
    return NextResponse.json({ ok: false, error: "Falta programa_id" }, { status: 400 });
  }

  try {
    const traducciones = await sql`
      SELECT id, codigo_js, exitosa, ejecutada_en
      FROM traducciones
      WHERE programa_id = ${programaId}
      ORDER BY ejecutada_en DESC
      LIMIT 50
    `;
    return NextResponse.json({ ok: true, traducciones });
  } catch (error) {
    console.error("Error en GET /api/traducciones:", error);
    return NextResponse.json({ ok: false, error: "Error del servidor" }, { status: 500 });
  }
}

/**
 * POST /api/traducciones
 * Registra una traduccion. Body: { programa_id, codigo_js, exitosa }
 */
export async function POST(req: Request) {
  try {
    const { programa_id, codigo_js, exitosa } = await req.json();

    if (!programa_id) {
      return NextResponse.json({ ok: false, error: "Falta programa_id" }, { status: 400 });
    }

    const [traduccion] = await sql`
      INSERT INTO traducciones (programa_id, codigo_js, exitosa)
      VALUES (${programa_id}, ${codigo_js ?? null}, ${exitosa !== false})
      RETURNING id, exitosa, ejecutada_en
    `;

    return NextResponse.json({ ok: true, traduccion }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/traducciones:", error);
    return NextResponse.json({ ok: false, error: "Error del servidor" }, { status: 500 });
  }
}
