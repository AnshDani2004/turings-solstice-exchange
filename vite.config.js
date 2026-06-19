import { defineConfig } from "vite";

// Relative assets keep the static build portable: localhost, a custom domain,
// and a GitHub Pages project site all resolve the same bundle correctly.
export default defineConfig({
  base: "./"
});
