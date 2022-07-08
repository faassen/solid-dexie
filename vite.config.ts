import path from "path";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import typescript from "@rollup/plugin-typescript";

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: "esnext",
    polyfillDynamicImport: false,
    lib: {
      entry: path.resolve(__dirname, "src/solid-dexie.ts"),
      name: "solid-dexie",
      fileName: (format) => `solid-dexie.${format}.js`,
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["solid-js", "solid-js/store", "dexie"],
      output: {
        globals: {
          "solid-js": "solidJS",
          "solid-js/store": "solidJSStore",
          dexie: "dexie",
        },
      },
      plugins: [
        typescript({
          target: "es2020",
          rootDir: "src",
          emitDeclarationOnly: true,
          declaration: true,
          declarationDir: "dist",
          exclude: ["**/*.test.ts", "**/*.tsx", "**/*fixture.ts"],
          allowSyntheticDefaultImports: true,
        }),
      ],
    },
  },
});
