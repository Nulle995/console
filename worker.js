importScripts(
  "https://cdnjs.cloudflare.com/ajax/libs/typescript/5.3.3/typescript.min.js"
);

// interceptar console.log
console.log = (...args) => {
  postMessage({ type: "log", value: args.join(" ") });
};

onmessage = (e) => {
  try {
    const tsCode = e.data;

    // Transpilar a JS
    const js = ts.transpileModule(tsCode, {
      compilerOptions: { module: ts.ModuleKind.ESNext },
    }).outputText;

    // Ejecutar
    new Function(js)();

    postMessage({ type: "done" });
  } catch (err) {
    postMessage({ type: "error", value: err.toString() });
  }
};
