let worker = new Worker("worker.js");
const consoleDiv = document.getElementById("console");

// Recibir logs del worker
worker.onmessage = (e) => {
  const msg = e.data;
  const p = document.createElement("div");

  if (msg.type === "log") {
    p.textContent = msg.value;
  } else if (msg.type === "error") {
    p.style.color = "red";
    p.textContent = msg.value;
  }

  consoleDiv.appendChild(p);
  consoleDiv.scrollTop = consoleDiv.scrollHeight;
};

// Cargar Monaco
require.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs" },
});

require(["vs/editor/editor.main"], function () {
  // 1. Leer código guardado (o poner algo por defecto si quieres)
  const savedCode = localStorage.getItem("editorCode") || "";

  const editor = monaco.editor.create(document.getElementById("editor"), {
    value: savedCode,
    language: "typescript",
    theme: "vs-dark",
    fontSize: 16,
    fontFamily: "Fira Code",
    fontLigatures: true,
    minimap: { enabled: false },
    lineNumbers: "on",
  });

  // 2. Función reutilizable para ejecutar el código del editor
  function runCode() {
    consoleDiv.innerHTML = "";
    const code = editor.getValue().trim();
    if (!code) return; // si está vacío, no hagas nada

    // Guardar siempre la última versión
    localStorage.setItem("editorCode", code);

    // Enviar al worker para que lo ejecute
    worker.postMessage(code);
  }

  // 3. Debounce al escribir
  let timeout;
  editor.onDidChangeModelContent(() => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      runCode();
    }, 500);
  });

  // 4. Ejecutar automáticamente el código que había en localStorage al iniciar
  if (savedCode.trim()) {
    runCode();
  }
});
