import ApiResult from "../../Util/ApiResult.js";
import Auth from "../../Util/Auth.js";
import { RedisCache } from "../../Util/Cache.js";
import Config from "../../Util/Config.js";
import Helper from "../../Util/Helper.js";
import EthereumUtils from "../../Util/EthereumUtils.js";
import Wallet from "../../Util/Wallet.js";

const signMessage = `
Welcome to ${Config.APP_NAME}

Click to sign in and accept the Terms of Service

This request will not trigger a blockchain transaction or cost any gas fees.

Wallet address: %s

Nonce: %s
`;

export default {
  async loginNonce(req, res) {
    try {
      const { address } = req.body;

      if (!address) {
        return res.send(ApiResult.error(404, "Please connect wallet"));
      }

      const userinfo = await Wallet.getWalletByAddress(address);

      const nonce = Helper.randomNo(32);
      const signStr = Helper.sprintf(signMessage, address, nonce);

      await RedisCache.set(`login_nonce:${Helper.md5(address)}`, signStr, 300);

      return res.send(
        ApiResult.success({
          signStr,
          is_new: userinfo ? 0 : 1
        })
      );
    } catch (error) {
      return res.send(ApiResult.exception(error, "AuthService.loginNonce"));
    }
  },

  async resolveInviter(req, res) {
    try {
      const refCode = String(req.body?.ref_code || req.body?.inviter || "").trim();
      if (!refCode) {
        return res.send(ApiResult.error(400, "source_member_empty"));
      }

      const inviter = await Wallet.resolveInviterByRefCode(refCode);
      if (!inviter) {
        return res.send(ApiResult.error(404, "source_member_error"));
      }

      return res.send(ApiResult.success({
        wallet: inviter.wallet,
        ref_code: inviter.ref_code || ""
      }));
    } catch (error) {
      return res.send(ApiResult.exception(error, "AuthService.resolveInviter"));
    }
  },

  async login(req, res) {
    try {
      const { address, signature } = req.body;
      const refCode = String(req.body?.ref_code || req.body?.inviter || "").trim();

      if (!address) {
        return res.send(ApiResult.error(404, "Please connect wallet"));
      }

      if (!signature) {
        return res.send(ApiResult.error(404, "Please generate a signature"));
      }

      const signStr = await RedisCache.get(`login_nonce:${Helper.md5(address)}`);
      if (!signStr) {
        return res.send(ApiResult.error(404, "Login nonce expired"));
      }

      const verified = await EthereumUtils.verifySignature(signStr, signature, address);
      if (!verified) {
        return res.send(ApiResult.error(404, "Signature verification failed"));
      }

      let authResult = await Wallet.auth(address);

      if (authResult.code !== 0) {
        const registerResult = await Wallet.register(address, refCode);
        if (registerResult.code !== 0) {
          return res.send(registerResult);
        }

        authResult = await Wallet.auth(address);
        if (authResult.code !== 0) {
          return res.send(authResult);
        }
      }

      const initAssetResult = await Wallet.initUserAssets(address);
      if (initAssetResult.code !== 0) {
        return res.send(initAssetResult);
      }

      const token = await Auth.generateToken(
        {
          id: authResult.data.id,
          address
        },
        24 * 3600
      );

      return res.send(ApiResult.success({
        ...token,
        ref_code: authResult.data.ref_code || ""
      }));
    } catch (error) {
      return res.send(ApiResult.exception(error, "AuthService.login"));
    }
  },

  async logout(req, res) {
    try {
      await Auth.forgetToken(req, res);
      return res.send(ApiResult.success());
    } catch (ex) {
      return res.send(ApiResult.error(130001, ex.message));
    }
  }
};
