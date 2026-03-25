import resolve from '@rollup/plugin-node-resolve';
import commonJS from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default {
  input: './src/main.ts',
  output: {
    file: 'build/index.js',
    format: 'cjs',
  },
  external: ['nakama-runtime'],
  plugins: [
    resolve(),
    commonJS({
      ignoreDynamicRequires: true,
    }),
    typescript(),
  ],
};
