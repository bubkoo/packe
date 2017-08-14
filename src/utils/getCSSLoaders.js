import autoprefixer from 'autoprefixer';

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
      loader: 'css-loader',
      options,
    });
  } else {
    own.push({
      loader: 'css-loader',
      options: {
        ...options,
        modules: true,
        localIdentName: '[local]___[hash:base64:5]',
      },
    });
  }

  nodeModules.push({
    loader: 'css-loader',
    options,
  });

  noCSSModules.push({
    loader: 'css-loader',
    options,
  });

  const postcssLoader = {
    loader: 'postcss-loader',
    options: {
      plugins: [
        autoprefixer(config.autoprefixer || {
          browsers: [
            '>1%',
            'last 4 versions',
            'Firefox ESR',
            'not ie < 9', // React doesn't support IE8 anyway
          ],
        }),
        ...(config.extraPostCSSPlugins || []),
      ],
    }
    ,
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
