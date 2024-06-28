import HtmlWebpackPlugin from 'html-webpack-plugin';

/** @param {import("webpack").Configuration} config */
export function webpack(config) {
    // Find the HtmlWebpackPlugin instance in the plugins array
    const htmlWebpackPluginIndex = config.plugins.findIndex(
        plugin => plugin instanceof HtmlWebpackPlugin
    );

    if (htmlWebpackPluginIndex !== -1) {
        // Modify the HtmlWebpackPlugin options to include webgazer.js
        const originalOptions = config.plugins[htmlWebpackPluginIndex].userOptions;
        config.plugins[htmlWebpackPluginIndex] = new HtmlWebpackPlugin({
            ...originalOptions,
            scriptLoading: 'blocking',
            templateContent: ({ htmlWebpackPlugin }) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>first-experiment (Development Build)</title>
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.jsdelivr.net/gh/jspsych/jspsych@jspsych@7.0.0/examples/js/webgazer/webgazer.js"></script>
    <script defer src="js/app.js"></script>
    <link href="css/main.css" rel="stylesheet">
</head>
<body>
</body>
</html>`});
    }

    return config;
}
