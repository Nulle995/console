let worker = null;
const consoleDiv = document.getElementById("console");
const savedCode =
  localStorage.getItem("editorCode") ||
  "// Escribe TypeScript 🎄\nconsole.log('Hola!')";

function writeToConsole(msg, error = false) {
  const div = document.createElement("div");
  if (error) div.style.color = "red";
  div.textContent = msg;
  consoleDiv.appendChild(div);
  consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

function runSafe(code) {
  // matar worker anterior si existe
  if (worker) worker.terminate();

  // crear un worker nuevo
  worker = new Worker("worker.js");

  // timeout de seguridad
  const safety = setTimeout(() => {
    writeToConsole("⛔ Código detenido: posible loop infinito");
    worker.terminate();
  }, 500); // medio segundo suficiente

  worker.onmessage = (e) => {
    const m = e.data;

    if (m.type === "log") {
      writeToConsole(m.value);
    } else if (m.type === "error") {
      writeToConsole(m.value, true);
      clearTimeout(safety);
    } else if (m.type === "done") {
      clearTimeout(safety);
    }
  };

  worker.postMessage(code);
}

runSafe(savedCode);

// Configuración de Monaco igual
require.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs" },
});
require(["vs/editor/editor.main"], function () {
  const editor = monaco.editor.create(document.getElementById("editor"), {
    value: savedCode,
    language: "typescript",
    theme: "vs-dark",
    fontSize: 16,
    fontFamily: "Fira Code",
    fontLigatures: true,
    minimap: { enabled: false },
  });

  let t;

  editor.onDidChangeModelContent(() => {
    clearTimeout(t);
    t = setTimeout(() => {
      const code = editor.getValue();
      localStorage.setItem("editorCode", code);
      consoleDiv.innerHTML = "";
      runSafe(code);
    }, 700);
  });

  // ejecutar al iniciar
  runSafe(savedCode);
});
