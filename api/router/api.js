import express from "express";
import Auth from "../Util/Auth.js";
import AuthService from "../services/Api/AuthService.js";
import ContentService from "../services/Api/ContentService.js";
const router = express.Router();

router.route("/content/announcements").get(ContentService.announcements);
router.route("/content/help-articles").get(ContentService.helpArticles);
router.route("/login/nonce").post(AuthService.loginNonce);
router.route("/login/inviter").post(AuthService.resolveInviter);
router.route("/login").post(AuthService.login);

router.route("*").all(Auth.verifyToken);
router.route("/logout").post(AuthService.logout);


export default router;
