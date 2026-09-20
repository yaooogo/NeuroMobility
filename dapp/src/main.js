import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import "./lib/reown.js";
import App from "./App.vue";
import router from "./router/index.js";
import "./style.css";

const assetModules = import.meta.glob("./assets/**/*", {
  eager: true,
  import: "default"
});

const assetMap = Object.fromEntries(
  Object.entries(assetModules).map(([key, value]) => [
    `@assets/${key.replace("./assets/", "")}`,
    value
  ])
);

function requireAsset(assetPath) {
  const normalizedPath = String(assetPath || "").replace(/\\/g, "/");
  const resolved = assetMap[normalizedPath];

  if (!resolved) {
    throw new Error(`Asset not found: ${normalizedPath}`);
  }

  return resolved;
}

const app = createApp(App);
app.config.globalProperties.require = requireAsset;
window.require = requireAsset;

app.use(VueQueryPlugin).use(router).mount("#app");
