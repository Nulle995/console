importScripts(
  "https://cdnjs.cloudflare.com/ajax/libs/typescript/5.3.3/typescript.min.js"
);

// ---- LÍMITE DE LOGS PARA NO REVENTAR LA PESTAÑA ---- //
let LOG_COUNT = 0;
const MAX_LOGS = 500; // ajusta si quieres

function safeLog(...args) {
  if (LOG_COUNT >= MAX_LOGS) {
    return;
  }
  LOG_COUNT++;
  postMessage({
    type: "log",
    value: args
      .map((v) =>
        typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)
      )
      .join(" "),
  });

  if (LOG_COUNT === MAX_LOGS) {
    postMessage({
      type: "error",
      value: "⚠️ Se alcanzó el máximo de logs permitidos.",
    });
  }
}

console.log = safeLog;

// ---- DETECTOR DE BUCLES INFINITOS EN EL WORKER ---- //

function hasDangerousLoop(src) {
  // while(true) con espacios
  if (/while\s*\(\s*true\s*\)/.test(src)) return true;

  // while(1<2) y variaciones simples
  if (/while\s*\(\s*1\s*<\s*2\s*\)/.test(src)) return true;

  // while(1==1), while(0==0)
  if (/while\s*\(\s*(1\s*==\s*1|0\s*==\s*0)\s*\)/.test(src)) return true;

  // while(<número distinto de 0>)
  const numWhile = /while\s*\(\s*([-+]?\d+)\s*\)/g;
  let m;
  while ((m = numWhile.exec(src))) {
    const n = Number(m[1]);
    if (!Number.isNaN(n) && n !== 0) return true;
  }

  // for(;;)
  if (/for\s*\(\s*;\s*;\s*\)/.test(src)) return true;

  return false;
}

onmessage = (e) => {
  try {
    const tsCode = e.data;

    // Reiniciar contador de logs en cada ejecución
    LOG_COUNT = 0;

    // Chequear bucles infinitos a nivel de TypeScript
    if (hasDangerousLoop(tsCode)) {
      postMessage({
        type: "error",
        value:
          "🚫 Bucle infinito detectado (while/for típico). Código no ejecutado.",
      });
      postMessage({ type: "done" });
      return;
    }

    const result = ts.transpileModule(tsCode, {
      compilerOptions: { module: ts.ModuleKind.ESNext },
    });

    const js = result.outputText;

    // Por si quieres también chequear en el JS transpileado:
    if (hasDangerousLoop(js)) {
      postMessage({
        type: "error",
        value:
          "🚫 Bucle infinito detectado después de transpilar. Código no ejecutado.",
      });
      postMessage({ type: "done" });
      return;
    }

    // Ejecutar el código JS
    new Function(js)();

    postMessage({ type: "done" });
  } catch (err) {
    postMessage({ type: "error", value: err.toString() });
    postMessage({ type: "done" });
  }
};
