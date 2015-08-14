
module.exports = {
  entry: {
    'react-sheet': getEntrySources(['./src/index.js'])
  },
  output: {
    path: './lib',
    publicPath: '/',
    filename: 'react-sheet.js',
    libraryTarget: 'umd',
    library: 'ReactSheet'
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loaders: getLoaders(['jsx', 'babel']),
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        loader: 'style!css!sass?sourceMap'
      }
    ]
  },
  externals: [
    {
      'react': {
        root: 'React',
        commonjs2: 'react',
        commonjs: 'react',
        amd: 'react'
      }
    }
  ]
};

function getEntrySources(sources) {
  if (process.env.NODE_ENV === 'dev') {
    sources.push('webpack-dev-server/client?http://localhost:8080');
    sources.push('webpack/hot/only-dev-server');
  }

  return sources;
}

function getLoaders(loaders){
  if (process.env.NODE_ENV === 'dev') {
    loaders.unshift('react-hot');
  }

  return loaders;
}
