export default function getCSSLoaders(config) {
  const { disableCSSSourceMap, disableCSSModules } = config;

  const own = [];
  const nodeModules = [];
  const noCSSModules = [];

  const options = {
    importLoaders: 1,
    sourceMap: !disableCSSSourceMap,
  };

  if (disableCSSModules) {
    own.push({
      loader: 'css',
      options,
    });
  } else {
    own.push({
      loader: 'css',
      options: {
        ...options,
        modules: true,
        localIdentName: '[local]___[hash:base64:5]',
      },
    });
  }

  nodeModules.push({
    loader: 'css',
    options,
  });

  noCSSModules.push({
    loader: 'css',
    options,
  });

  const postcssLoader = {
    loader: 'postcss',
  };

  noCSSModules.push(postcssLoader);
  own.push(postcssLoader);
  nodeModules.push(postcssLoader);

  return {
    own,
    nodeModules,
    noCSSModules,
  };
}
