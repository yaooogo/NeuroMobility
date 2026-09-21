import express from "express";
import Auth from "../Util/Auth.js";
import AuthService from "../services/Api/AuthService.js";
import ContentService from "../services/Api/ContentService.js";
import AssetService from "../services/Api/AssetService.js";
const router = express.Router();

router.route("/content/announcements").get(ContentService.announcements);
router.route("/content/help-articles").get(ContentService.helpArticles);
router.route("/content/about").get(ContentService.about);
router.route("/content/vehicles").get(ContentService.vehicles);
router.route("/content/investment-config").get(ContentService.investmentConfig);
router.route("/login/nonce").post(AuthService.loginNonce);
router.route("/login/inviter").post(AuthService.resolveInviter);
router.route("/login").post(AuthService.login);

router.route("*").all(Auth.verifyToken);
router.route("/logout").post(AuthService.logout);
router.route("/asset/overview").get(AssetService.overview);
router.route("/asset/withdraw/prepare").post(AssetService.prepareWithdrawal);
router.route("/asset/withdraw/submitted").post(AssetService.withdrawalSubmitted);
router.route("/asset/records").get(AssetService.records);


export default router;
