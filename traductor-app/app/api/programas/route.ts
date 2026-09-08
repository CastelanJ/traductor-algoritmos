import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/programas?usuario_id=1
 * Lista los programas de un usuario, con cuantas traducciones y errores
 * lleva cada uno. Las subconsultas evitan traer todas las filas hijas.
 */
export async function GET(req: Request) {
  const usuarioId = Number(new URL(req.url).searchParams.get("usuario_id"));

  if (!usuarioId) {
    return NextResponse.json({ ok: false, error: "Falta usuario_id" }, { status: 400 });
  }

  try {
    const programas = await sql`
      SELECT
        p.id,
        p.titulo,
        p.codigo,
        p.creado_en,
        p.modificado_en,
        (SELECT COUNT(*) FROM traducciones t WHERE t.programa_id = p.id)::int AS num_traducciones,
        (SELECT COUNT(*) FROM errores      e WHERE e.programa_id = p.id)::int AS num_errores
      FROM programas p
      WHERE p.usuario_id = ${usuarioId}
      ORDER BY p.modificado_en DESC
      LIMIT 50
    `;
    return NextResponse.json({ ok: true, programas });
  } catch (error) {
    console.error("Error en GET /api/programas:", error);
    return NextResponse.json({ ok: false, error: "Error del servidor" }, { status: 500 });
  }
}

/**
 * POST /api/programas
 * Guarda un programa. Si viene "id", actualiza ese en vez de crear otro,
 * para que volver a guardar no llene la tabla de copias.
 * Body: { usuario_id, titulo, codigo, id? }
 */
export async function POST(req: Request) {
  try {
    const { usuario_id, titulo, codigo, id } = await req.json();

    if (!usuario_id || !titulo || !codigo) {
      return NextResponse.json(
        { ok: false, error: "Faltan usuario_id, titulo o codigo" },
        { status: 400 }
      );
    }

    if (id) {
      const [programa] = await sql`
        UPDATE programas
        SET titulo = ${titulo}, codigo = ${codigo}, modificado_en = NOW()
        WHERE id = ${id} AND usuario_id = ${usuario_id}
        RETURNING id, titulo, modificado_en
      `;

      if (!programa) {
        return NextResponse.json(
          { ok: false, error: "El programa no existe o no es tuyo" },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true, programa, creado: false });
    }

    const [programa] = await sql`
      INSERT INTO programas (usuario_id, titulo, codigo)
      VALUES (${usuario_id}, ${titulo}, ${codigo})
      RETURNING id, titulo, creado_en, modificado_en
    `;

    return NextResponse.json({ ok: true, programa, creado: true }, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/programas:", error);
    return NextResponse.json({ ok: false, error: "Error del servidor" }, { status: 500 });
  }
}

/**
 * DELETE /api/programas?id=1&usuario_id=1
 * Borra un programa. Sus traducciones y errores se van en cascada.
 */
export async function DELETE(req: Request) {
  const params = new URL(req.url).searchParams;
  const id = Number(params.get("id"));
  const usuarioId = Number(params.get("usuario_id"));

  if (!id || !usuarioId) {
    return NextResponse.json({ ok: false, error: "Faltan id o usuario_id" }, { status: 400 });
  }

  try {
    const filas = await sql`
      DELETE FROM programas
      WHERE id = ${id} AND usuario_id = ${usuarioId}
      RETURNING id
    `;

    if (filas.length === 0) {
      return NextResponse.json(
        { ok: false, error: "El programa no existe o no es tuyo" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error en DELETE /api/programas:", error);
    return NextResponse.json({ ok: false, error: "Error del servidor" }, { status: 500 });
  }
}
