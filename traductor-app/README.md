# Traductor de Algoritmos Educativos

Aplicacion web que analiza pseudocodigo en espanol y lo traduce a JavaScript
ejecutable, mostrando en pantalla cada una de las fases intermedias de un
compilador.

Proyecto de la materia de **Lenguajes y Automatas**.

---

## 1. Que es y para que sirve

En los cursos de programacion los algoritmos se escriben primero en
**pseudocodigo**: instrucciones en espanol, sin la sintaxis de ningun lenguaje
real. Sirven para razonar la solucion, pero no se pueden ejecutar: se quedan en
el papel.

Este programa cierra esa brecha. Recibe el pseudocodigo, lo analiza y genera el
**JavaScript equivalente**, que ademas puede correr ahi mismo para ver el
resultado.

Su valor no esta solo en el resultado final, sino en que **muestra el proceso**.
Un compilador real (`javac`, `gcc`) es una caja negra: entra codigo, sale un
binario. Aqui cada fase intermedia se dibuja en pantalla: la lista de tokens, el
arbol sintactico, la tabla de simbolos y el codigo generado. Eso lo vuelve una
herramienta didactica para entender **como funciona un compilador por dentro**.

---

## 2. Como funciona

El procesamiento sigue las fases clasicas del *front-end* de un compilador. Cada
una consume la salida de la anterior.

```
  Pseudocodigo
       |
       v
  [1] Analisis lexico      lexer.js        ->  lista de tokens
       |
       v
  [2] Analisis sintactico  parser.js       ->  AST
       |
       v
  [3] Analisis semantico   semantic.js     ->  tabla de simbolos + avisos
       |
       v
  [4] Generacion de codigo translator.js   ->  JavaScript
       |
       v
  [5] Ejecucion            main.js         ->  salida del programa
```

### Fase 1 — Analisis lexico (*scanner*)

Recorre el texto caracter por caracter y lo agrupa en **tokens**: las unidades
minimas con significado. Cada token guarda su categoria, su valor y la linea en
que aparecio (necesario para reportar errores con precision).

| Categoria | Significado           | Ejemplos                     |
| --------- | --------------------- | ---------------------------- |
| `KW`      | Palabra reservada     | `INICIO`, `SI`, `MIENTRAS`   |
| `ID`      | Identificador         | `A`, `contador`, `total`     |
| `NUMBER`  | Literal numerico      | `10`, `3.5`                  |
| `STRING`  | Literal de cadena     | `"resultado: "`              |
| `OP`      | Operador              | `+`, `>=`, `==`              |
| `SYM`     | Simbolo de puntuacion | `;`, `,`, `(`, `)`           |
| `EOL`     | Fin de linea          |                              |
| `UNKNOWN` | Caracter no valido    |                              |

Las palabras reservadas se reconocen sin distinguir mayusculas de minusculas.
Los comentarios (`//` hasta el fin de linea) se descartan aqui.

### Fase 2 — Analisis sintactico (*parser*)

Toma la lista plana de tokens y reconstruye la **estructura jerarquica** del
programa en un **AST** (*Abstract Syntax Tree*, arbol de sintaxis abstracta).
Una lista no dice que el `ESCRIBIR` pertenece a la rama verdadera de un `SI`;
el arbol si.

Esta implementado como un **analizador de descenso recursivo**: una funcion por
regla gramatical, llamandose entre si. Las expresiones se resuelven con una
cascada de precedencia, de menor a mayor prioridad:

```
  parseOr    ->  O                       (menor precedencia)
  parseAnd   ->  Y
  parseRel   ->  ==  !=  <  >  <=  >=
  parseAdd   ->  +  -
  parseMul   ->  *  /
  parseUnary ->  -  NO
  parsePrimary -> numeros, cadenas, identificadores, ( )   (mayor)
```

Ese orden es lo que hace que `2 + 3 * 4` se agrupe como `2 + (3 * 4)` y no al
reves: `parseAdd` llama a `parseMul`, asi que la multiplicacion queda mas abajo
en el arbol y por lo tanto se evalua primero.

Los errores de esta fase son de **forma**: falta un `ENTONCES`, sobra un
parentesis, no se cerro un `FIN_SI`.

### Fase 3 — Analisis semantico

Un programa puede estar bien formado y aun asi no tener sentido. Esta fase
recorre el AST construyendo una **tabla de simbolos** (que variables existen y
desde cuando) y verifica el **significado**.

La regla implementada es el uso de variables no inicializadas:

```
C = A + B;      correcto:  A y B se leyeron antes
D = X + 1;      error:     'X' usada antes de ser leida/asignada
```

Sintacticamente `D = X + 1` es impecable. El problema es de significado, no de
gramatica: por eso se detecta aqui y no en la fase anterior.

### Fase 4 — Generacion de codigo

Recorre el AST y emite el JavaScript equivalente:

| Pseudocodigo             | JavaScript generado           |
| ------------------------ | ----------------------------- |
| `LEER A`                 | `let A = prompt("Ingrese A:")` |
| `ESCRIBIR x`             | `console.log(x)`              |
| `C = A + B`              | `C = (A + B)`                 |
| `SI c ENTONCES ... FIN_SI` | `if (c) { ... }`            |
| `SINO`                   | `else { ... }`                |
| `MIENTRAS c HACER ... FIN_MIENTRAS` | `while (c) { ... }` |
| `REPETIR ... HASTA c`    | `do { ... } while (!(c))`     |
| `==` / `!=`              | `===` / `!==`                 |
| `Y` / `O` / `NO`         | `&&` / `\|\|` / `!`           |

Notese la traduccion de `REPETIR/HASTA`: en pseudocodigo el ciclo termina
**cuando** la condicion se cumple, mientras que `do...while` continua **mientras**
se cumple. Por eso la condicion se niega.

### Fase 5 — Ejecucion

El JavaScript generado se ejecuta con `new Function()` dentro de una funcion
anonima autoinvocada. Se intercepta temporalmente `console.log` para redirigir
la salida al panel de resultados, y se restaura siempre al terminar, incluso si
el programa lanza un error.

---

## 3. El lenguaje soportado

```
INICIO;
  LEER A, B;
  C = A + B;

  SI C > 10 ENTONCES
    ESCRIBIR "La suma es mayor a 10: ", C;
  SINO
    ESCRIBIR "La suma es menor o igual a 10: ", C;
  FIN_SI;

  I = 0;
  MIENTRAS I < 5 HACER
    ESCRIBIR I;
    I = I + 1;
  FIN_MIENTRAS;

  REPETIR
    I = I - 1;
  HASTA I == 0;
FIN;
```

| Elemento    | Sintaxis                                              |
| ----------- | ----------------------------------------------------- |
| Programa    | `INICIO; ... FIN;`                                    |
| Entrada     | `LEER var1, var2;`                                    |
| Salida      | `ESCRIBIR expr1, expr2;`                              |
| Asignacion  | `variable = expresion;`                               |
| Condicional | `SI cond ENTONCES ... [SINO ...] FIN_SI;`             |
| Ciclo       | `MIENTRAS cond HACER ... FIN_MIENTRAS;`               |
| Ciclo       | `REPETIR ... HASTA cond;`                             |
| Comentario  | `// hasta el fin de la linea`                         |
| Logicos     | `Y`, `O`, `NO`                                        |

---

## 4. Arquitectura

El requisito del proyecto es que **la aplicacion y la base de datos vivan en
maquinas distintas, con direcciones IP distintas**.

```
   Maquina A                                Maquina B
 +---------------------------+           +------------------+
 |  Next.js                  |   HTTPS   |  Neon            |
 |                           |  --------->  PostgreSQL 18   |
 |  public/traductor/        |    TLS    |                  |
 |    el compilador (cliente)|           |  5 tablas        |
 |                           |           |                  |
 |  app/api/                 |           |                  |
 |    route handlers (server)|           |                  |
 +---------------------------+           +------------------+
```

Una pagina HTML estatica **no puede** conectarse directamente a PostgreSQL sin
exponer las credenciales a cualquiera que abra el codigo fuente. Por eso existe
la capa intermedia: los **route handlers** de Next se ejecutan en el servidor,
donde la cadena de conexion permanece privada en `.env.local`.

El compilador (las cinco fases) sigue corriendo por completo **en el navegador**.
La base de datos solo aporta autenticacion y persistencia.

### Base de datos

| Tabla          | Contenido                                                |
| -------------- | -------------------------------------------------------- |
| `usuarios`     | Credenciales. Contrasenas con hash **bcrypt**             |
| `programas`    | Pseudocodigo guardado, asociado a su autor                |
| `traducciones` | Historial del JavaScript generado en cada intento         |
| `errores`      | Fallos detectados, con su **fase**, linea y token         |
| `sesiones`     | Bitacora de accesos con IP, exitosos y fallidos           |

Las cinco se llenan desde la aplicacion. Al guardar un programa queda asociado a
su autor; a partir de ahi, cada vez que se analiza se registra la traduccion
generada y los errores encontrados, etiquetados con la fase que los detecto.

Las tablas se relacionan mediante **llaves foraneas** con `ON DELETE CASCADE`,
lo que garantiza **integridad referencial**: es imposible registrar un programa
de un usuario inexistente, y al eliminar un usuario se limpian en cascada sus
programas, traducciones y errores.

La columna `errores.fase` lleva una restriccion `CHECK` que solo admite
`lexico`, `sintactico`, `semantico` o `ejecucion` — las fases descritas arriba.

El esquema completo esta en [`db/schema.sql`](db/schema.sql).

### Seguridad

- Las contrasenas se almacenan **hasheadas con bcrypt** (sal aleatoria por
  usuario). El hash es irreversible; la verificacion se hace comparando, nunca
  descifrando.
- Las consultas usan **sentencias parametrizadas**. Los valores interpolados en
  `` sql`... ${valor} ...` `` no se concatenan al texto SQL: viajan por separado,
  lo que elimina la posibilidad de **inyeccion SQL**.
- La cadena de conexion vive solo en `.env.local`, excluido del control de
  versiones.
- El cliente nunca recibe detalles internos de los errores del servidor; estos
  quedan unicamente en el log del proceso.

---

## 5. Tecnologias

| Capa            | Herramienta                                          |
| --------------- | ---------------------------------------------------- |
| Compilador      | JavaScript sin dependencias ni frameworks            |
| Interfaz        | HTML, CSS, SVG. Iconos: Material Symbols Outlined    |
| Tipografia      | IBM Plex Sans / IBM Plex Mono                        |
| Servidor        | Next.js 16 (App Router) + TypeScript                 |
| Base de datos   | PostgreSQL 18 en Neon (serverless)                   |
| Driver          | `@neondatabase/serverless` (conexion por HTTP)       |
| Hash            | `bcryptjs`                                           |

Se eligio el driver HTTP de Neon en lugar de una conexion TCP tradicional
porque los route handlers son efimeros: no conviene mantener un *pool* de
conexiones abierto entre invocaciones.

---

## 6. Estructura del proyecto

```
traductor-app/
├─ app/
│  ├─ api/
│  │  ├─ health/route.ts       Diagnostico de conexion
│  │  ├─ login/route.ts        Autenticacion contra la tabla usuarios
│  │  ├─ programas/route.ts    Guardar, listar y borrar programas
│  │  ├─ traducciones/route.ts Historial de traducciones
│  │  └─ errores/route.ts      Errores por fase
│  └─ layout.tsx, page.tsx
├─ lib/
│  └─ db.ts                    Cliente SQL de Neon (inicializacion diferida)
├─ public/traductor/           La aplicacion del compilador
│  ├─ index.html
│  ├─ css/styles.css
│  └─ js/
│     ├─ lexer.js              Fase 1
│     ├─ parser.js             Fase 2
│     ├─ semantic.js           Fase 3
│     ├─ translator.js         Fase 4
│     ├─ ast-renderer.js       Dibujo del AST en SVG
│     └─ main.js               Interfaz y orquestacion
├─ db/schema.sql               Esquema de la base de datos
└─ scripts/
   ├─ prueba-compilador.mjs    Prueba las 4 fases sin navegador
   └─ diagnostico.mjs          Verifica la conexion y los hashes
```

---

## 7. Instalacion

Requisitos: Node.js 18 o superior y una cuenta gratuita en [Neon](https://neon.com).

**1. Crear la base de datos.** En la consola de Neon, abrir *Postgres database >
SQL Editor* y ejecutar el contenido de [`db/schema.sql`](db/schema.sql). Esto
crea las cinco tablas, sus indices y dos usuarios de prueba.

**2. Instalar dependencias.**

```bash
npm install
```

**3. Configurar la conexion.** Copiar `.env.local.example` como `.env.local` y
reemplazar la cadena por la propia (Neon > *Connect* > *Copy snippet*):

```
DATABASE_URL="postgresql://usuario:contrasena@host.neon.tech/neondb?sslmode=require"
```

**4. Arrancar.**

```bash
npm run dev
```

| Direccion                                | Contenido                     |
| ---------------------------------------- | ----------------------------- |
| `http://localhost:3000/traductor/index.html` | La aplicacion             |
| `http://localhost:3000/api/health`       | Diagnostico de la conexion    |

Usuarios de prueba: `admin` / `1234` y `alumno` / `alumno123`.

### Verificacion

```bash
node scripts/prueba-compilador.mjs              # las 4 fases, sin navegador
node --env-file=.env.local scripts/diagnostico.mjs   # conexion y hashes
```

Para comprobar que la autenticacion realmente viaja a la otra maquina, tras
iniciar sesion ejecutar en el SQL Editor de Neon:

```sql
SELECT u.usuario, s.ip_origen, s.exitoso, s.fecha
FROM sesiones s
LEFT JOIN usuarios u ON u.id = s.usuario_id
ORDER BY s.fecha DESC;
```

---

## 8. Limitaciones conocidas

- **El ciclo `PARA` no esta implementado.** La palabra esta declarada en el
  analizador lexico y `FIN_PARA` se reconoce como delimitador, pero el parser
  no tiene la regla correspondiente: usarlo produce
  `Instruccion no reconocida: KW PARA`.
- **Las variables asignadas no se declaran** en el JavaScript generado. Funciona
  porque el codigo se ejecuta en modo no estricto, pero el archivo descargado
  fallaria bajo `"use strict"` o como modulo.
- **`LEER` dentro de un bloque** genera `let` dentro de ese bloque, por lo que
  la variable no es visible fuera de el.
- **No hay verificacion de tipos.** El analisis semantico solo comprueba
  inicializacion de variables.
- **La entrada vacia se convierte en cero**: `prompt()` devuelve una cadena
  vacia al cancelar, y `Number("")` es `0`.
- **Los literales numericos no se validan**: `1.2.3` se acepta como un solo
  token.
- El registro de traducciones y errores solo ocurre para programas ya guardados
  en la base, porque esas tablas exigen un `programa_id` existente.

---

## 9. Creditos

Compilador y diseno original de la interfaz: equipo del proyecto.
Integracion con base de datos, rediseno de la interfaz y correcciones: Brisa Aguayo.
