export default function getPublicPath(config) {
  if (Array.isArray(config)) {
    return config[0].output.publicPath;
  }
  return config.output.publicPath;
}
