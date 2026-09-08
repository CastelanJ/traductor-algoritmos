import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

const [info] = await sql`
  SELECT
    inet_server_addr()::text AS ip_del_servidor,
    inet_server_port()       AS puerto,
    inet_client_addr()::text AS ip_que_ve_de_mi,
    current_database()       AS base,
    current_user             AS usuario,
    version()                AS version
`;

console.log("Lo que la base responde sobre si misma:");
console.log("  ip_del_servidor : " + (info.ip_del_servidor ?? "(no la revela)"));
console.log("  puerto          : " + (info.puerto ?? "(no lo revela)"));
console.log("  ip_que_ve_de_mi : " + (info.ip_que_ve_de_mi ?? "(no la revela)"));
console.log("  base            : " + info.base);
console.log("  usuario         : " + info.usuario);
console.log("  version         : " + info.version.split(" on ")[0]);

// El host sale de la propia cadena, sin exponer la contraseña
const host = new URL(process.env.DATABASE_URL.replace("postgresql://", "https://")).hostname;
console.log("\nHost al que te conectas: " + host);
