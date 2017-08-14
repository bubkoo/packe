import { join } from 'path';
import { existsSync } from 'fs';
import webpack from 'webpack';
import autoprefixer from 'autoprefixer';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import noamalizePath from '../utils/noamalizePath';
import normalizeDefine from './normalizeDefine';


export const node = {
  fs: 'empty',
  net: 'empty',
  tls: 'empty',
};

export const baseSvgLoader = {
  test: /\.svg$/,
  loader: 'file',
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
      require.resolve('babel-preset-es2015'),
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
      modulesDirectories: [
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
      modulesDirectories: [
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
      loader: 'url',
      options: {
        limit: 10000,
        name: 'static/[name].[hash:8].[ext]',
      },
    },
    {
      test: /\.(js|jsx)$/,
      loader: 'babel',
      include: paths.appSrc,
      options: babelOptions,
    },
  ];
}

export function getLastRules({ paths, babelOptions }) {
  return [
    {
      test: /\.html$/,
      loader: 'file',
      options: { name: '[name].[ext]' },
    },
    {
      test: /\.tsx?$/,
      include: paths.appSrc,
      use: [
        {
          loader: 'babel',
          options: babelOptions,
        },
        {
          loader: 'awesome-typescript',
          options: { transpileOnly: true },
        },
      ],
    },
  ];
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
        'style',
        ...cssLoaders.own,
      ],
    },
    {
      test: /\.less$/,
      include: includeTest.bind(null, paths.appSrc),
      use: [
        'style',
        ...cssLoaders.own,
        {
          loader: 'less',
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
        'style',
        ...cssLoaders.nodeModules,
      ],
    },
    {
      test: /\.less$/,
      include: includeTest.bind(null, paths.appNodeModules),
      use: [
        'style',
        ...cssLoaders.nodeModules,
        {
          loader: 'less',
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
          'style',
          ...cssLoaders.noCSSModules,
        ],
      },
      {
        test: /\.less$/,
        include,
        use: [
          'style',
          ...cssLoaders.noCSSModules,
          {
            loader: 'less',
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
          'style',
          ...cssLoaders.own,
          {
            loader: 'sass',
            options: sassOptions,
          },
        ],
      },
      {
        test: /\.scss$/,
        include: includeTest.bind(null, paths.appNodeModules),
        use: [
          'style',
          ...cssLoaders.nodeModules,
          {
            loader: 'sass',
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
            'style',
            ...cssLoaders.noCSSModules,
            {
              loader: 'sass',
              options: sassOptions,
            },
          ],
        },
      ];
    }
  }

  if (env === 'production') {
    rules.forEach((rule) => {
      rule.use = ExtractTextPlugin.extract({
        fallback: 'style',
        use: rule.use.slice(1),
      });
    });
  }

  return rules;
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

  plugins.push(new webpack.LoaderOptionsPlugin({
    options: {
      context: __dirname,
      postcss: [
        autoprefixer(config.autoprefixer || {
          browsers: [
            '>1%',
            'last 4 versions',
            'Firefox ESR',
            'not ie < 9', // React doesn't support IE8 anyway
          ],
        }),
        ...(config.extraPostCSSPlugins ? config.extraPostCSSPlugins : []),
      ],
    },
  }));

  return plugins;
}

export function addExtraBabelIncludes(config, paths, includes = [], babelOptions) {
  includes.forEach((include) => {
    config.module.rules.push({
      test: /\.(js|jsx)$/,
      include: join(paths.appDirectory, include),
      loader: 'babel',
      options: babelOptions,
    });
  });
  return config;
}
