import { join } from 'path';
import { existsSync } from 'fs';
import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import noamalizePath from '../utils/noamalizePath';


export const node = {
  fs: 'empty',
  net: 'empty',
  tls: 'empty',
};

export const baseSvgLoader = {
  test: /\.svg$/,
  loader: 'file-loader',
  options: {
    name: 'static/[name].[hash:8].[ext]',
  },
};

export const spriteSvgLoader = {
  test: /\.(svg)$/i,
  loader: 'svg-sprite',
};

export const defaultDevtool = '#cheap-module-eval-source-map';


export function getBabelOptions(config) {
  return {
    babelrc: false,
    presets: [
      [
        require.resolve('babel-preset-env'), {
          useBuiltIns: true,
        },
      ],
      require.resolve('babel-preset-react'),
      require.resolve('babel-preset-stage-0'),
    ].concat(config.extraBabelPresets || []),
    plugins: [
      require.resolve('babel-plugin-add-module-exports'),
      require.resolve('babel-plugin-react-require'),
      require.resolve('babel-plugin-syntax-dynamic-import'),
    ].concat(config.extraBabelPlugins || []),
    cacheDirectory: true,
  };
}

export function getResolve(config, paths) {
  return {
    resolve: {
      modules: [
        paths.ownNodeModules,
        paths.appNodeModules,
      ],
      extensions: [
        ...(config.extraResolveExtensions || []),
        '.web.js', '.web.jsx', '.web.ts', '.web.tsx',
        '.js', '.json', '.jsx', '.ts', '.tsx',
      ],
    },
    resolveLoader: {
      modules: [
        paths.ownNodeModules,
        paths.appNodeModules,
      ],
    },
  };
}

export function getFirstRules({ paths, babelOptions }) {
  return [
    {
      exclude: [
        /\.(html|ejs)$/,
        /\.(js|jsx)$/,
        /\.(css|less|scss)$/,
        /\.json$/,
        /\.svg$/,
        /\.tsx?$/,
      ],
      loader: 'url-loader',
      options: {
        limit: 10000,
        name: 'static/[name].[hash:8].[ext]',
      },
    },
    {
      test: /\.(js|jsx)$/,
      loader: 'babel-loader',
      include: paths.appSrc,
      options: babelOptions,
    },
  ];
}

export function getLastRules({ config, paths, babelOptions }) {
  return [
    {
      test: /\.html$/,
      loader: 'file-loader',
      options: { name: '[name].[ext]' },
    },
    {
      test: /\.tsx?$/,
      include: paths.appSrc,
      use: [
        {
          loader: 'babel-loader',
          options: babelOptions,
        },
        {
          loader: 'awesome-typescript-loader',
          options: { transpileOnly: true },
        },
      ],
    },
  ].concat(config.extraLoaders || []);
}

export function getCSSRules(env, { config, paths, cssLoaders, theme }) {
  const hasExclude = config.cssModulesExclude && config.cssModulesExclude.length > 0;

  function isExclude(modulePath) {
    if (hasExclude) {
      return config.cssModulesExclude.some(item =>
        noamalizePath(join(paths.appDirectory, item)).indexOf(noamalizePath(modulePath)) > -1,
      );
    }
    return false;
  }

  function includeTest(root, modulePath) {
    return modulePath.indexOf(root) > -1 && !isExclude(modulePath);
  }

  let rules = [
    {
      test: /\.css$/,
      include: includeTest.bind(null, paths.appSrc),
      use: [
        'style-loader',
        ...cssLoaders.own,
      ],
    },
    {
      test: /\.less$/,
      include: includeTest.bind(null, paths.appSrc),
      use: [
        'style-loader',
        ...cssLoaders.own,
        {
          loader: 'less-loader',
          options: {
            modifyVars: theme,
          },
        },
      ],
    },
    {
      test: /\.css$/,
      include: includeTest.bind(null, paths.appNodeModules),
      use: [
        'style-loader',
        ...cssLoaders.nodeModules,
      ],
    },
    {
      test: /\.less$/,
      include: includeTest.bind(null, paths.appNodeModules),
      use: [
        'style-loader',
        ...cssLoaders.nodeModules,
        {
          loader: 'less-loader',
          options: {
            modifyVars: theme,
          },
        },
      ],
    },
  ];

  if (hasExclude) {
    const include = config.cssModulesExclude.map(item => join(paths.appDirectory, item));
    rules = [
      ...rules,
      {
        test: /\.css$/,
        include,
        use: [
          'style-loader',
          ...cssLoaders.noCSSModules,
        ],
      },
      {
        test: /\.less$/,
        include,
        use: [
          'style-loader',
          ...cssLoaders.noCSSModules,
          {
            loader: 'less-loader',
            options: {
              modifyVars: theme,
            },
          },
        ],
      },
    ];
  }

  if (config.sass) {
    const sassOptions = config.sass === true ? {} : config.sass;
    rules = [
      ...rules,
      {
        test: /\.scss$/,
        include: includeTest.bind(null, paths.appSrc),
        use: [
          'style-loader',
          ...cssLoaders.own,
          {
            loader: 'sass-loader',
            options: sassOptions,
          },
        ],
      },
      {
        test: /\.scss$/,
        include: includeTest.bind(null, paths.appNodeModules),
        use: [
          'style-loader',
          ...cssLoaders.nodeModules,
          {
            loader: 'sass-loader',
            options: sassOptions,
          },
        ],
      },
    ];

    if (hasExclude) {
      const include = config.cssModulesExclude.map(item => join(paths.appDirectory, item));
      rules = [
        ...rules,
        {
          test: /\.scss$/,
          include,
          use: [
            'style-loader',
            ...cssLoaders.noCSSModules,
            {
              loader: 'sass-loader',
              options: sassOptions,
            },
          ],
        },
      ];
    }
  }

  if (env === 'production') {
    rules.forEach((rule) => {
      const use = rule.use.slice(1).map(item => ({
        ...item,
        options: {
          ...item.options,
          // minimize: true,
        },
      }));
      rule.use = ExtractTextPlugin.extract({
        fallback: 'style-loader',
        use,
      });
    });
  }

  return rules;
}

export function normalizeDefine(define) {
  return Object.keys(define).reduce((memo, key) => {
    memo[key] = JSON.stringify(define[key]);
    return memo;
  }, {});
}

export function getCommonPlugins({ config, paths, appBuild, NODE_ENV }) {
  const plugins = [];

  let defineObj = {
    'process.env': {
      NODE_ENV: JSON.stringify(NODE_ENV),
    },
  };

  if (config.define) {
    defineObj = {
      ...defineObj,
      ...normalizeDefine(config.define),
    };
  }

  plugins.push(new webpack.DefinePlugin(defineObj));

  if (existsSync(join(paths.appSrc, 'index.ejs'))) {
    plugins.push(new HtmlWebpackPlugin({
      template: 'src/index.ejs',
      inject: true,
    }));
  }

  if (existsSync(paths.appPublic)) {
    plugins.push(new CopyWebpackPlugin([
      {
        from: paths.appPublic,
        to: appBuild,
      },
    ]));
  }

  if (config.multipage) {
    // hash
    const name = config.hash ? 'common.[hash]' : 'common';
    plugins.push(new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      filename: `${name}.js`,
    }));
  }

  return plugins;
}

export function addExtraBabelIncludes(config, paths, includes = [], babelOptions) {
  includes.forEach((include) => {
    config.module.rules.push({
      test: /\.(js|jsx)$/,
      include: join(paths.appDirectory, include),
      loader: 'babel-loader',
      options: babelOptions,
    });
  });
  return config;
}
