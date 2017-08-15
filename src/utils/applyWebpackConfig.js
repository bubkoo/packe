import { existsSync } from 'fs';
import { resolve } from 'path';
import './registerBabel';

export default function applyWebpackConfig(config, env) {
  const filePath = resolve('webpack.config.js');
  if (existsSync(filePath)) {
    return require(filePath)(config, env);  // eslint-disable-line
  }
  return config;
}
