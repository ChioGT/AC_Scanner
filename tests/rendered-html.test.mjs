import assert from "node:assert/strict";
import test from "node:test";

test("renders the Spanish Love or Control application without starter metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<html\s+lang="es"/i);
  assert.match(html, /<title>Love or Control\? — QVAC Private AI<\/title>/i);
  assert.match(html, /¿Es amor/i);
  assert.match(html, /Salida rápida/i);
  assert.match(html, /6 TIPOS DE VIOLENCIA/i);
  assert.match(html, /270<!-- --> ejemplos de referencia/i);
  assert.match(html, /Control digital y celos coercitivos/i);
  assert.match(html, /Violencia económica y patrimonial/i);
  assert.match(html, /Motor semántico activo/i);
  assert.match(html, /Motor semántico local activo/i);
  assert.match(html, /Escribe o pega aquí los mensajes que deseas revisar/i);
  assert.match(html, /ESTE ESPACIO ES PARA TI/i);
  assert.match(html, /No es tu culpa\./i);
  assert.match(html, /Lo que sientes importa\./i);
  assert.match(html, /Tu seguridad es primero\./i);
  assert.match(html, /Mereces respeto y libertad\./i);
  assert.doesNotMatch(html, /CONVERSACIONES DE PRUEBA|Caso de demostración|Selecciona un ejemplo/i);
  assert.doesNotMatch(html, /Mándame tu ubicación ahora mismo|Si me amaras me darías/i);
  assert.doesNotMatch(html, /Starter Project|codex-preview/i);
});
