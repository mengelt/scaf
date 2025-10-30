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
  sourcemap: isDevelopment,
  external: [
    'oracledb',
    'bufferutil',
    'utf-8-validate',
    'swagger-ui-express'
  ],
  logLevel: 'info',
  minify: isProduction,
  treeShaking: true,
  inject: ['./esbuild-shims.js'],
};

async function build() {
  try {
    if (isDevelopment) {
      const ctx = await esbuild.context({
        ...config,
        plugins: [
          {
            name: 'rebuild-notify',
            setup(build) {
              build.onEnd((result) => {
                if (result.errors.length === 0) {
                  console.log('✅ Build complete - ' + new Date().toLocaleTimeString());
                } else {
                  console.error('❌ Build failed with errors');
                }
              });
            },
          },
        ],
      });

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
