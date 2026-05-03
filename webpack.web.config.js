const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const appDirectory = path.resolve(__dirname);

const transpileModules = [
  path.resolve(appDirectory, 'index.web.js'),
  path.resolve(appDirectory, 'App.tsx'),
  path.resolve(appDirectory, 'src'),
  path.resolve(appDirectory, 'node_modules/react-native'),
  path.resolve(appDirectory, 'node_modules/react-native-safe-area-context'),
  path.resolve(appDirectory, 'node_modules/react-native-svg'),
  path.resolve(appDirectory, 'node_modules/react-native-gifted-charts'),
  path.resolve(appDirectory, 'node_modules/@react-native-community/datetimepicker'),
  path.resolve(appDirectory, 'node_modules/@react-native-async-storage/async-storage'),
];

module.exports = {
  entry: path.resolve(appDirectory, 'index.web.js'),
  output: {
    path: path.resolve(appDirectory, 'dist-web'),
    filename: 'bundle.[contenthash].js',
    clean: true,
    publicPath: '/',
    assetModuleFilename: 'assets/[name].[hash][ext][query]',
  },
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.jsx', '.json'],
    alias: {
      'react-native$': 'react-native-web',
      'expo-linear-gradient': path.resolve(
        appDirectory,
        'src/web/shims/expoLinearGradient.tsx',
      ),
    },
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.[jt]sx?$/,
        include: transpileModules,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
          },
        },
      },
      {
        test: /\.(png|jpg|jpeg|gif|webp)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(appDirectory, 'web/index.html'),
    }),
  ],
  devServer: {
    host: '0.0.0.0',
    port: 8080,
    open: false,
    hot: true,
    historyApiFallback: true,
    client: {
      overlay: true,
    },
  },
  performance: {
    hints: false,
  },
};
