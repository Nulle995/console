// Importar TypeScript dentro del worker
importScripts(
  "https://cdnjs.cloudflare.com/ajax/libs/typescript/5.3.3/typescript.min.js"
);

// Interceptar console.log
console.log = (...args) => {
  postMessage({ type: "log", value: args.join(" ") });
};

onmessage = (e) => {
  const tsCode = e.data;

  try {
    // Transpilar TS → JS
    const jsCode = ts.transpileModule(tsCode, {
      compilerOptions: { module: ts.ModuleKind.ESNext },
    }).outputText;

    // Ejecutar JS
    eval(jsCode);
  } catch (err) {
    postMessage({ type: "error", value: String(err) });
  }
};
