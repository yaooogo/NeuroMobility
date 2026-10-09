import express from "express";
import Auth from "../Util/Auth.js";
import AuthService from "../services/Api/AuthService.js";
import ContentService from "../services/Api/ContentService.js";
import AssetService from "../services/Api/AssetService.js";
import InvestmentService from "../services/Api/InvestmentService.js";
import TeamService from "../services/Api/TeamService.js";
import OpenService from "../services/Api/OpenService.js";
const router = express.Router();

router.route("/content/announcements").post(ContentService.announcements);
router.route("/content/help-articles").post(ContentService.helpArticles);
router.route("/content/about").post(ContentService.about);
router.route("/content/vehicles").post(ContentService.vehicles);
router.route("/content/investment-config").post(ContentService.investmentConfig);
router.route("/content/platform-stats").post(ContentService.platformStats);
router.route("/login/nonce").post(AuthService.loginNonce);
router.route("/login/inviter").post(AuthService.resolveInviter);
router.route("/login").post(AuthService.login);
router.route("/open/api/deposits").post(OpenService.deposits);

router.route("*").all(Auth.verifyToken);
router.route("/profile").post(AuthService.profile);
router.route("/team").post(TeamService.overview);
router.route("/logout").post(AuthService.logout);
router.route("/asset/overview").post(AssetService.overview);
router.route("/asset/withdraw/prepare").post(AssetService.prepareWithdrawal);
router.route("/asset/withdraw/submitted").post(AssetService.withdrawalSubmitted);
router.route("/asset/records").post(AssetService.records);
router.route("/investment/create").post(InvestmentService.create);
router.route("/investment/orders").post(InvestmentService.list);
router.route("/investment/order").post(InvestmentService.detail);
router.route("/investment/dividends").post(InvestmentService.dividends);


export default router;
