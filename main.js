let worker = null;
const consoleDiv = document.getElementById("console");

function writeToConsole(msg, isError = false) {
  const p = document.createElement("div");
  if (isError) p.style.color = "red";
  p.textContent = msg;
  consoleDiv.appendChild(p);
  consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

// Crear y ejecutar un worker nuevo por ejecución
function runCodeInWorker(code) {
  // matar worker viejo si existe
  if (worker) worker.terminate();

  // nuevo worker
  worker = new Worker("worker.js");

  // timeout anti-loop infinito (1 segundo)
  const safety = setTimeout(() => {
    writeToConsole("⛔ Ejecución detenida (posible bucle infinito)");
    worker.terminate();
  }, 1000);

  // recibir logs / errores del worker
  worker.onmessage = (e) => {
    const msg = e.data;

    if (msg.type === "log") {
      writeToConsole(msg.value);
    } else if (msg.type === "error") {
      writeToConsole(msg.value, true);
    } else if (msg.type === "done") {
      clearTimeout(safety);
    }
  };

  // enviar el código a ejecutar
  worker.postMessage(code);
}

// Cargar Monaco
require.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs" },
});

require(["vs/editor/editor.main"], function () {
  const savedCode =
    localStorage.getItem("editorCode") ||
    "// Escribe TypeScript 🎄\nconsole.log('Hola!')";

  const editor = monaco.editor.create(document.getElementById("editor"), {
    value: savedCode,
    language: "typescript",
    theme: "vs-dark",
    fontSize: 16,
    fontFamily: "Fira Code",
    fontLigatures: true,
    minimap: { enabled: false },
  });

  function runCode() {
    consoleDiv.innerHTML = "";
    const code = editor.getValue();
    localStorage.setItem("editorCode", code);
    runCodeInWorker(code);
  }

  // Debounce
  let t;
  editor.onDidChangeModelContent(() => {
    clearTimeout(t);
    t = setTimeout(runCode, 500);
  });

  // Ejecutar al iniciar
  runCode();
});
