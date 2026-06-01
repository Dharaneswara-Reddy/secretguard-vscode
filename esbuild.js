const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/extension.ts', 'src/cli-scanner.ts'],
  bundle: true,
  outdir: 'dist',
  platform: 'node',
  target: 'node18',
  external: ['vscode'],
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
  logLevel: 'info'
};

if (isWatch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch();
    console.log('Watching for changes...');
  });
} else {
  esbuild.build(buildOptions).then(() => {
    console.log('Build complete.');
  }).catch(() => process.exit(1));
}
