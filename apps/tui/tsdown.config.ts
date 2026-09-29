import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/main.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node24',
  dts: false,
  sourcemap: true,
  clean: true,
  fixedExtension: true,
  deps: {
    // @maka/core ships source as its dev export, so it has to be bundled.
    alwaysBundle: ['@maka/core'],
    // Nothing from node_modules may end up in the bundle: an accidental bundle
    // fails the build instead of silently bloating it or duplicating a package
    // that is also loaded by @ai-sdk/tui.
    onlyBundle: [],
  },
})
