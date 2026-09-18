import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import "./lib/reown.js";
import App from "./App.vue";
import router from "./router/index.js";
import "./style.css";

createApp(App).use(VueQueryPlugin).use(router).mount("#app");
