import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Esta ruta consulta la base en cada peticion; nunca se pre-genera.
export const dynamic = "force-dynamic";

/**
 * Prueba de conexión. Abre http://localhost:3000/api/health en el navegador.
 * Si responde con la lista de tablas, la conexión a Neon funciona.
 */
export async function GET() {
  try {
    const tablas = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    const [{ total }] = await sql`SELECT COUNT(*)::int AS total FROM usuarios`;

    return NextResponse.json({
      ok: true,
      conectado_a: "Neon PostgreSQL",
      tablas: tablas.map((t) => t.table_name),
      usuarios_registrados: total,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
