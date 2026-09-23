import ApiResult from "../../Util/ApiResult.js";
import Auth from "../../Util/Auth.js";
import { RedisCache } from "../../Util/Cache.js";
import Config from "../../Util/Config.js";
import Helper from "../../Util/Helper.js";
import EthereumUtils from "../../Util/EthereumUtils.js";
import Wallet from "../../Util/Wallet.js";
import CacheData from "../../Util/CacheData.js";
import { formatAssetAmount, parseAssetAmount } from "../../Util/AssetAmount.js";
import { toDappApiError, toDappApiMessage } from "../../Util/DappApiMessage.js";

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
      return res.send(ApiResult.exception(toDappApiError(error), "AuthService.loginNonce"));
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
      return res.send(ApiResult.exception(toDappApiError(error), "AuthService.resolveInviter"));
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
      return res.send(ApiResult.exception(toDappApiError(error), "AuthService.login"));
    }
  },

  async profile(req, res) {
    try {
      const userinfo = await Wallet.getWalletByAddress(req.auth?.address());
      if (!userinfo) return res.send(ApiResult.error(404, "User not found"));

      const level = Number(userinfo.level || 0);
      const manualLevel = Number(userinfo.manual_level || 0);
      const isManualLevel = Number(userinfo.is_manual_level || 0) === 1 ? 1 : 0;
      const effectiveLevel = isManualLevel === 1 ? manualLevel : level;
      const communityInvestsRaw = /^\d+$/u.test(String(userinfo.community_invests || '0'))
        ? BigInt(userinfo.community_invests || 0)
        : 0n;
      const rules = (await CacheData.getWalletLevelRules())
        .slice()
        .sort((left, right) => left.level - right.level);
      const nextRule = rules.find(rule => rule.level > effectiveLevel) || rules.at(-1);
      const targetRaw = BigInt(parseAssetAmount(String(nextRule?.min_price || 0), 18));
      const progressBasisPoints = nextRule?.level > effectiveLevel && targetRaw > 0n
        ? (communityInvestsRaw * 10000n / targetRaw)
        : 10000n;
      const boundedProgressBasisPoints = progressBasisPoints > 10000n ? 10000n : progressBasisPoints;
      return res.send(ApiResult.success({
        effective_level: effectiveLevel,
        community_invests: formatAssetAmount(communityInvestsRaw.toString(), 18),
        next_level: Number(nextRule?.level || effectiveLevel),
        next_level_amount: String(nextRule?.min_price || 0),
        level_progress_percent: Number(boundedProgressBasisPoints) / 100
      }));
    } catch (error) {
      return res.send(ApiResult.exception(toDappApiError(error), "AuthService.profile"));
    }
  },

  async logout(req, res) {
    try {
      await Auth.forgetToken(req, res);
      return res.send(ApiResult.success());
    } catch (ex) {
      return res.send(ApiResult.error(130001, toDappApiMessage(ex)));
    }
  }
};
