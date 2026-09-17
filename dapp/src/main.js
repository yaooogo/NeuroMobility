import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import "./lib/reown.js";
import App from "./App.vue";
import "./style.css";

createApp(App).use(VueQueryPlugin).mount("#app");
