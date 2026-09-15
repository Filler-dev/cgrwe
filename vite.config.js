import { defineConfig } from "vite";
import autoprefixer from "autoprefixer";

// Short aliases for frequently used palettes. The query string is the same one
// the app writes to the address bar, so a shortcut can be created by copying
// the current URL.
const SHORTCUTS = {
  rwe: "/?background-colors=&foreground-colors=%23000000%2C+Black%0A%23FFFFFF%2C+White%0A%231D4477%2C+Blue%0A%2300B1EB%2C+Energy+Blue%0A%2300A19F%2C+Energy+Dark+Green%0A%233ED8C3%2C+Energy+Light+Green%0A%23005E65%2C+RWE+Accent+Green%0A%235AB88F%2C+RWE+Accent+Light+Green%0A%23EF7D00%2C+Accent+Orange%0A%23FFCC00%2C+RWE+Accent+Yellow%0A%23B61F34%2C+Accent+Dark+Red%0A%23E7343F%2C+Accent+Light+Red%0A%2352555C%2C+Accent+Dark+Gray%0A%23ADAFB1%2C+Accent+Light+Gray%0A%23E8E8E4%2C+Sand%0A%23557399%2C+Blue+1%0A%238EA1BB%2C+Blue+2%0A%23C6D0DD%2C+Blue+3%0A%2340C5F0%2C+Energy+Blue+1%0A%2380D8F5%2C+Energy+Blue+2%0A%23BFECFA%2C+Energy+Blue+3%0A%2340B9B7%2C+Energy+Dark+Green+1%0A%2380D0CF%2C+Energy+Dark+Green+2%0A%23BFE8E7%2C+Energy+Dark+Green+3%0A%236EE2D2%2C+Energy+Light+Green+1%0A%239FECE1%2C+Energy+Light+Green+2%0A%23CFF5F0%2C+Energy+Light+Green+3%0A%23EEEEEB%2C+Sand+1%0A%23F4F4F1%2C+Sand+2%0A%23F9F9F8%2C+Sand+3%0A&es-color-form__tile-size=80&es-color-form__show-contrast=aaa&es-color-form__show-contrast=aa&es-color-form__show-contrast=aa18&es-color-form__show-contrast=dnp",
};

function redirectPage(target) {
  const attr = target.replace(/&/g, "&amp;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Contrast Grid</title>
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${attr}">
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body><a href="${attr}">Continue to the contrast grid</a></body>
</html>
`;
}

function shortcutsPlugin() {
  // Runs ahead of Vite's static and history-fallback middleware.
  const middleware = (req, res, next) => {
    const slug = (req.url ?? "").split("?")[0].replace(/^\/|\/$/g, "");
    const target = SHORTCUTS[slug];

    if (!target) {
      return next();
    }

    res.writeHead(302, { Location: target });
    res.end();
  };

  return {
    name: "contrast-grid:shortcuts",
    // Braces matter: `middlewares.use()` returns the connect app, and Vite
    // would run a returned function as a post-hook.
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
    generateBundle() {
      for (const [slug, target] of Object.entries(SHORTCUTS)) {
        this.emitFile({
          type: "asset",
          fileName: `${slug}/index.html`,
          source: redirectPage(`..${target}`),
        });
      }
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [shortcutsPlugin()],
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: ["src/components"],
        silenceDeprecations: [
          "import",
          "global-builtin",
          "slash-div",
          "color-functions",
        ],
      },
    },
    postcss: { plugins: [autoprefixer()] },
  },
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
});
