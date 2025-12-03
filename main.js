let worker = null;
const consoleDiv = document.getElementById("console");

const savedCode =
  localStorage.getItem("editorCode") ||
  "// Escribe TypeScript\nconsole.log('Hola!')";

function write(msg, err = false) {
  const div = document.createElement("div");
  if (err) div.style.color = "red";
  div.textContent = msg;
  consoleDiv.appendChild(div);
  consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

// Ejecutar código en worker
function runSafe(code) {
  if (worker) worker.terminate();

  worker = new Worker("worker.js");

  const safety = setTimeout(() => {
    write("⛔ Loop infinito detectado (timeout)");
    worker.terminate();
    worker = null;
  }, 800);

  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === "log") write(m.value);
    if (m.type === "error") write(m.value, true);
    if (m.type === "done") clearTimeout(safety);
  };

  worker.postMessage(code);
}

// ----------- DETECTOR MUY SIMPLE EN EL MAIN --------------- //
// (Solo para evitar los casos más obvios antes de enviar al worker)

function hasObviousInfiniteLoop(code) {
  // while(true) / while( true ) / etc.
  const whileTrue = /while\s*\(\s*true\s*\)/;

  // while(1<2) con o sin espacios
  const whileOneLessTwo = /while\s*\(\s*1\s*<\s*2\s*\)/;

  // while(1==1), while(0==0)
  const whileAlwaysTrue = /while\s*\(\s*(1\s*==\s*1|0\s*==\s*0)\s*\)/;

  // while(5), while(-1), etc.
  const whileNumLiteral = /while\s*\(\s*([-+]?\d+)\s*\)/g;
  let m;
  let numInfinite = false;
  while ((m = whileNumLiteral.exec(code))) {
    const n = Number(m[1]);
    if (!Number.isNaN(n) && n !== 0) {
      numInfinite = true;
      break;
    }
  }

  // for(;;)
  const infiniteFor = /for\s*\(\s*;\s*;\s*\)/;

  return (
    whileTrue.test(code) ||
    whileOneLessTwo.test(code) ||
    whileAlwaysTrue.test(code) ||
    numInfinite ||
    infiniteFor.test(code)
  );
}

// --------------------------------------------------------- //

// ----- Cargar Monaco AMD -----
require.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs",
  },
});

require(["vs/editor/editor.main"], () => {
  const editor = monaco.editor.create(document.getElementById("editor"), {
    value: savedCode,
    language: "typescript",
    theme: "vs-dark",
    minimap: { enabled: false },
    fontSize: 16,
    fontFamily: "Fira Code",
  });

  // Desactivar análisis pesado
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });

  let t;

  editor.onDidChangeModelContent(() => {
    clearTimeout(t);

    t = setTimeout(() => {
      const code = editor.getValue();
      localStorage.setItem("editorCode", code);
      consoleDiv.innerHTML = "";

      // While que está escribiéndose (incompleto): while(...)
      if (/while\s*\([^)]*$/.test(code)) {
        write("⏳ Esperando que termines el while...");
        return;
      }

      // Chequeo básico antes de mandar al worker
      if (hasObviousInfiniteLoop(code)) {
        write(
          "⚠️ Se ha detectado un posible bucle infinito (while/for). No se ejecutará."
        );
        return;
      }

      runSafe(code);
    }, 500);
  });

  // Ejecutar al cargar
  runSafe(savedCode);
});
