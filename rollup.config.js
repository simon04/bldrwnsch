import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'app.js',
  output: {
    file: 'bundle.js',
    format: 'iife'
  },
  plugins: [postcss(), resolve(), commonjs()]
};
