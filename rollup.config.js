import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import postcssCopy from 'postcss-copy';
import path from 'path';

export default [
  {
    input: 'app.js',
    output: {
      file: 'dist/bundle.js',
      format: 'iife'
    },
    plugins: [
      resolve(),
      commonjs(),
      postcss({
        extract: path.join('dist', 'style.css'),
        plugins: [postcssCopy({dest: 'dist', template: 'images/[name].[ext]'})]
      })
    ]
  },
  {
    input: 'bldrwnschCluster.js',
    output: {
      file: 'dist/bundle.cluster.js',
      format: 'iife'
    },
    plugins: [resolve(), commonjs()]
  }
];
