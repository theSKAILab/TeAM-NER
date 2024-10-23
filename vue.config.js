const webpack = require("webpack");

module.exports = {
  publicPath: "/TeAM-NER/",
  // publicPath: process.env.NODE_ENV === "production" ? "/TeAM-NER/" : "/",

  pluginOptions: {
    quasar: {
      importStrategy: "kebab",
      rtlSupport: false,
    },
  },

  configureWebpack: (config) => {
    return {
      plugins: [
        new webpack.DefinePlugin({
          APPLICATION_VERSION: JSON.stringify(
            require("./package.json").version
          ),
        }),
      ],
    };
  },

  transpileDependencies: ["quasar"],
};
