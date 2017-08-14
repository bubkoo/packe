export default function getOutputPath(config) {
  if (Array.isArray(config)) {
    return config[0].outputPath;
  }
  return config.outputPath;
}
