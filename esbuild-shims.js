import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const _require = createRequire(import.meta.url);
const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

// Make them available as globals
globalThis.require = _require;
globalThis.__filename = _filename;
globalThis.__dirname = _dirname;

// Also export them for esbuild's inject
export { _require as require, _filename as __filename, _dirname as __dirname };
