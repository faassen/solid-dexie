const babelJest = require("babel-jest");

const jsxTransform = require("babel-plugin-jsx-dom-expressions");

const plugins = [
  [
    jsxTransform,
    {
      moduleName: "solid-js/web",
      builtIns: [
        "For",
        "Show",
        "Switch",
        "Match",
        "Suspense",
        "SuspenseList",
        "Portal",
        "Index",
        "Dynamic",
        "ErrorBoundary",
      ],
      contextToCustomElements: true,
      wrapConditionals: true,
      generate: "dom",
    },
  ],
];

module.exports = babelJest.default.createTransformer({
  plugins,
});
