const webpack = require("webpack");

module.exports = {
  publicPath: "/TeAM-NER/",
  // publicPath: process.env.NODE_ENV === "production" ? "/TeAM-NER/" : "/",

  pluginOptions: {
    quasar: {
      importStrategy: "kebab",
      rtlSupport: false,
    },
    pwa: {
      name: "Text Annotation Review and Tagging (TART)",
      themeColor: '#027be3',
      msTileColor: '#027be3',
    }
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
