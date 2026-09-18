import { createRouter, createWebHistory } from "vue-router";
import AssetsView from "../views/AssetsView.vue";
import HomeView from "../views/HomeView.vue";
import InvestView from "../views/InvestView.vue";
import UserCenterView from "../views/UserCenterView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: HomeView, meta: { navKey: "home" } },
    { path: "/home", redirect: { name: "home" } },
    { path: "/invest", name: "invest", component: InvestView, meta: { navKey: "invest" } },
    { path: "/assets", name: "assets", component: AssetsView, meta: { navKey: "assets" } },
    { path: "/mine", name: "mine", component: UserCenterView, meta: { navKey: "mine" } },
    { path: "/:pathMatch(.*)*", redirect: { name: "home" } }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;
