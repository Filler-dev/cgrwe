import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

// Short aliases for frequently used palettes. The query string is the same one
// the app writes to the address bar, so a shortcut can be created by copying
// the current URL.
const SHORTCUTS = {
  rwe: "/?fg=000000;+Black%0AFFFFFF;+White%0A1D4477;+Blue%0A00B1EB;+Energy+Blue%0A00A19F;+Energy+Dark+Green%0A3ED8C3;+Energy+Light+Green%0A005E65;+Accent+Green%0A5AB88F;+Accent+Light+Green%0AEF7D00;+Accent+Orange%0AFFCC00;+Accent+Yellow%0AB61F34;+Accent+Dark+Red%0AE7343F;+Accent+Light+Red%0A52555C;+Accent+Dark+Gray%0AADAFB1;+Accent+Light+Gray%0AE8E8E4;+Sand%0A557399;+Blue+1%0A8EA1BB;+Blue+2%0AC6D0DD;+Blue+3%0A40C5F0;+Energy+Blue+1%0A80D8F5;+Energy+Blue+2%0ABFECFA;+Energy+Blue+3%0A40B9B7;+Energy+Dark+Green+1%0A80D0CF;+Energy+Dark+Green+2%0ABFE8E7;+Energy+Dark+Green+3%0A6EE2D2;+Energy+Light+Green+1%0A9FECE1;+Energy+Light+Green+2%0ACFF5F0;+Energy+Light+Green+3%0AEEEEEB;+Sand+1%0AF4F4F1;+Sand+2%0AF9F9F8;+Sand+3%0A",
};

function redirectPage(target) {
  const attr = target.replace(/&/g, "&amp;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Contrast Grid</title>
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
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
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        impressum: resolve(root, "impressum.html"),
      },
    },
  },
});
