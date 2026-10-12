/**
 * Jest runs this package as CommonJS, and `@metamask/cryptography` ships
 * ESM only. Transpile those files when the test runtime loads them.
 *
 * This file is CommonJS because Jest loads transformers without the
 * package's TypeScript build.
 */
const ts = require('typescript');

/**
 * @type {import('@jest/transform').Transformer}
 */
module.exports = {
  /**
   * Transpile an ESM file to CommonJS.
   *
   * @param {string} sourceText - ESM source from `@metamask/cryptography`.
   * @param {string} sourcePath - Absolute path of the source file.
   * @returns {{ code: string }} CommonJS source Jest can execute.
   */
  process(sourceText, sourcePath) {
    const result = ts.transpileModule(sourceText, {
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: sourcePath,
    });

    return { code: result.outputText };
  },
};
