import { createRouter, createWebHistory } from "vue-router";
import AnnouncementsView from "../views/AnnouncementsView.vue";
import AboutView from "../views/AboutView.vue";
import AssetsView from "../views/AssetsView.vue";
import DividendRecordsView from "../views/DividendRecordsView.vue";
import HelpCenterView from "../views/HelpCenterView.vue";
import HomeView from "../views/HomeView.vue";
import InvestView from "../views/InvestView.vue";
import InvestSuccessView from "../views/InvestSuccessView.vue";
import TeamView from "../views/TeamView.vue";
import TransactionRecordsView from "../views/TransactionRecordsView.vue";
import UserCenterView from "../views/UserCenterView.vue";
import VehiclesView from "../views/VehiclesView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: HomeView, meta: { navKey: "home" } },
    { path: "/home", redirect: { name: "home" } },
    { path: "/invest", name: "invest", component: InvestView, meta: { navKey: "invest" } },
    { path: "/invest/success", name: "invest-success", component: InvestSuccessView, meta: { navKey: "invest", showBottomNav: false } },
    { path: "/assets", name: "assets", component: AssetsView, meta: { navKey: "assets" } },
    { path: "/mine", name: "mine", component: UserCenterView, meta: { navKey: "mine" } },
    { path: "/team", name: "team", component: TeamView, meta: { navKey: "mine", showBottomNav: false } },
    { path: "/help", name: "help", component: HelpCenterView, meta: { navKey: "mine", showBottomNav: false } },
    { path: "/about", name: "about", component: AboutView, meta: { navKey: "mine", showBottomNav: false } },
    { path: "/announcements", name: "announcements", component: AnnouncementsView, meta: { navKey: "home", showBottomNav: false } },
    { path: "/transaction-records", name: "transaction-records", component: TransactionRecordsView, meta: { navKey: "assets", showBottomNav: false } },
    { path: "/dividend-records", name: "dividend-records", component: DividendRecordsView, meta: { navKey: "home", showBottomNav: false } },
    { path: "/vehicles", name: "vehicles", component: VehiclesView, meta: { navKey: "home", showBottomNav: false } },
    { path: "/:pathMatch(.*)*", redirect: { name: "home" } }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;
