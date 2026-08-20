import esbuild from 'esbuild'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const watch = process.argv.includes('--watch')

const ctx = await esbuild.context({
  entryPoints: [join(root, 'src/client/index.tsx')],
  outfile: join(root, 'lib/client/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['chrome100', 'firefox100', 'safari15'],
  minify: false,
  sourcemap: true,
  plugins: [
    {
      name: 'module-loader',
      setup(build) {
        build.onLoad({ filter: /\.tsx$/ }, async (args) => {
          const contents = await Deno.readTextFile(args.path)
          return { contents, loader: 'tsx' }
        })
      },
    },
  ],
})

if (watch) {
  await ctx.watch()
  console.log('Watching for changes...')
} else {
  await ctx.rebuild()
  await ctx.dispose()
  console.log('Build complete.')
}
