import Helper from "./Helper.js";
import Config from "./Config.js";
import { RedisCache } from "./Cache.js";
import ApiResult from "./ApiResult.js";
import crypto from "crypto";
import User from "./User.js";

function getCacheKey(token) {
  return `auth_token:${Helper.md5(token)}`;
}

function buildRequestAuth(payload, token, cacheKey) {
  return {
    user: payload,
    token,
    cacheKey,
    id() {
      return payload?.id ?? 0;
    },
    address() {
      return payload?.address ?? "";
    },
    username() {
      return payload?.username ?? "";
    }
  };
}

const Auth = {
  async generateToken(payload, expires = null) {
    if (!expires) {
      expires = Config.TOKEN_EXPIRE_TIME || 24 * 3600;
    }

    payload = JSON.parse(JSON.stringify(payload || {}));
    const userId = payload.id;
    const token = crypto
      .createHash("sha256")
      .update(`${Date.now()}_${Math.random()}_${userId || ""}`)
      .digest("hex");

    const cacheKey = getCacheKey(token);
    await RedisCache.set(cacheKey, JSON.stringify(payload), expires);

    return {
      expiresIn: expires,
      refreshToken: token,
      token,
      tokenHead: "Bearer "
    };
  },

  async verifyToken(req, res, next) {
    const authorization = req?.headers?.authorization || "";
    const [tokenHead, rawToken] = authorization.split(" ");
    const token = tokenHead?.toLowerCase() === "bearer" ? rawToken : "";

    if (!token) {
      return res.send(ApiResult.error(401, "Authentication failed"));
    }

    const cacheKey = getCacheKey(token);
    const user = await RedisCache.get(cacheKey);

    if (!user) {
      return res.send(ApiResult.error(401, "Authentication failed"));
    }

    let payload = null;
    try {
      payload = JSON.parse(user);
    } catch (error) {
      return res.send(ApiResult.error(401, "Authentication failed"));
    }

    if (!payload) {
      return res.send(ApiResult.error(401, "Authentication failed"));
    }

    const authAddress = String(payload?.address || "").trim();
    if (authAddress) {
      const wallet = await User.getWalletByAddress(authAddress);
      if (!wallet) {
        await RedisCache.delete(cacheKey);
        return res.send(ApiResult.error(401, "Authentication failed"));
      }
    }

    req.auth = buildRequestAuth(payload, token, cacheKey);
    next();
  },

  async forgetToken(req, res = null, next = null) {
    const cacheKey = req?.auth?.cacheKey;
    if (cacheKey) {
      await RedisCache.delete(cacheKey);
    }

    if (next) {
      next();
    }
  },

  async verifyRouter(req, res, next = null) {
    const allowRouter = ["/test"];
    if (!allowRouter.includes(req._parsedOriginalUrl.pathname)) {
      return res.send(ApiResult.error(401, "Authentication failed"));
    }

    if (next) {
      next();
    }
  }
};

export default Auth;
