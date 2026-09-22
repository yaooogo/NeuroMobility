import express from "express";
import Auth from "../Util/Auth.js";
import AuthService from "../services/Api/AuthService.js";
import ContentService from "../services/Api/ContentService.js";
import AssetService from "../services/Api/AssetService.js";
import InvestmentService from "../services/Api/InvestmentService.js";
import TeamService from "../services/Api/TeamService.js";
const router = express.Router();

router.route("/content/announcements").get(ContentService.announcements);
router.route("/content/help-articles").get(ContentService.helpArticles);
router.route("/content/about").get(ContentService.about);
router.route("/content/vehicles").get(ContentService.vehicles);
router.route("/content/investment-config").get(ContentService.investmentConfig);
router.route("/content/platform-stats").get(ContentService.platformStats);
router.route("/login/nonce").post(AuthService.loginNonce);
router.route("/login/inviter").post(AuthService.resolveInviter);
router.route("/login").post(AuthService.login);

router.route("*").all(Auth.verifyToken);
router.route("/profile").get(AuthService.profile);
router.route("/team").get(TeamService.overview);
router.route("/logout").post(AuthService.logout);
router.route("/asset/overview").get(AssetService.overview);
router.route("/asset/withdraw/prepare").post(AssetService.prepareWithdrawal);
router.route("/asset/withdraw/submitted").post(AssetService.withdrawalSubmitted);
router.route("/asset/records").get(AssetService.records);
router.route("/investment/create").post(InvestmentService.create);
router.route("/investment/orders").get(InvestmentService.list);
router.route("/investment/order").get(InvestmentService.detail);
router.route("/investment/dividends").get(InvestmentService.dividends);


export default router;
