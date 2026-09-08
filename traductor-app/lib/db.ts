import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cliente: NeonQueryFunction<false, false> | null = null;

/**
 * Crea el cliente la primera vez que se usa (no al importar el archivo),
 * para que `next build` funcione aunque todavía no exista .env.local.
 */
function obtenerCliente(): NeonQueryFunction<false, false> {
  if (!cliente) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "Falta DATABASE_URL. Crea el archivo .env.local con la cadena de conexión de Neon."
      );
    }
    cliente = neon(url);
  }
  return cliente;
}

/**
 * Cliente SQL de Neon. Se usa como template literal:
 *
 *   const filas = await sql`SELECT * FROM usuarios WHERE id = ${id}`;
 *
 * Lo que va dentro de ${...} NO se concatena al texto: el driver lo manda
 * como parámetro aparte, así que no hay riesgo de inyección SQL.
 */
export const sql: NeonQueryFunction<false, false> = new Proxy(
  (() => {}) as unknown as NeonQueryFunction<false, false>,
  {
    apply(_destino, _this, args: unknown[]) {
      return (obtenerCliente() as (...a: unknown[]) => unknown)(...args);
    },
    get(_destino, prop) {
      return (obtenerCliente() as unknown as Record<string | symbol, unknown>)[prop];
    },
  }
);
