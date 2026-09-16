import express from "express";
import Auth from "../Util/Auth.js";
import AuthService from "../services/Api/AuthService.js";
const router = express.Router();

router.route("/login").post(AuthService.login);

router.route("*").all(Auth.verifyToken);


export default router;
