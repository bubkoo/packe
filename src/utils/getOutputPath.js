function getOutputPathInConfig(config) {
  if (Array.isArray(config)) {
    return config[0].outputPath;
  }
  return config.outputPath;
}

export default function getOutputPath(options, config) {
  return options.outputPath || getOutputPathInConfig(config) || 'dist';
}
