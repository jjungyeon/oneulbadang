import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

export function sourceLoader(stubs = new Map()) {
  const cache = new Map();
  const nativeRequire = createRequire(import.meta.url);
  function load(relative) {
    if (stubs.has(relative)) return stubs.get(relative);
    if (cache.has(relative)) return cache.get(relative).exports;
    const filename = path.resolve(relative);
    const loaded = { exports: {} }; cache.set(relative, loaded);
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => {
      if (name.startsWith("node:")) return nativeRequire(name);
      const target = name.startsWith("@/") ? path.join("src", name.slice(2)) : path.join(path.dirname(relative), name);
      return load(`${target}.ts`);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }
  return load;
}
