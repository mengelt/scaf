import esbuild from 'esbuild';

const isProduction = process.argv.includes('--production');
const isDevelopment = !isProduction;

const config = {
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outdir: 'dist',
  format: 'esm',
  sourcemap: true,
  external: [
    'oracledb',
    'bufferutil',
    'utf-8-validate'
  ],
  logLevel: 'info',
  minify: isProduction,
  treeShaking: true,
  banner: {
    js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);import { fileURLToPath } from 'url';import { dirname } from 'path';const __filename = fileURLToPath(import.meta.url);const __dirname = dirname(__filename);"
  },
};

async function build() {
  try {
    if (isDevelopment) {
      const ctx = await esbuild.context(config);

      await ctx.watch();
      console.log('👀 Watching for changes...');

      // Keep the process running
      await new Promise(() => {});
    } else {
      await esbuild.build(config);
      console.log('✅ Build complete');
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
