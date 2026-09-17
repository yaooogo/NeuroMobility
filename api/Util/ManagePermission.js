import ApiResult from "./ApiResult.js";
import DB from "./database/DB.js";

// 当前后台已实现的功能权限项
const MANAGE_MENU_PERMISSIONS = [
  { key: "asset-tokens", label: "资产类型" },
  { key: "asset-tokens-update", label: "资产类型-编辑" },
  { key: "user-asset-logs", label: "资产变更记录" },
  { key: "user-frozen-asset-logs", label: "冻结资产变更记录" },
  { key: "wallets", label: "钱包管理" },
  { key: "wallets-create", label: "钱包管理-新增" },
  { key: "wallets-update", label: "钱包管理-编辑" },
  { key: "wallet-assets", label: "钱包资产管理" },
  { key: "wallet-assets-update", label: "钱包资产管理-变更资产" },
  { key: "announcements", label: "公告管理" },
  { key: "announcements-create", label: "公告管理-新增" },
  { key: "announcements-update", label: "公告管理-编辑" },
  { key: "announcements-delete", label: "公告管理-删除" },
  { key: "parameter-config", label: "参数配置" },
  { key: "parameter-config-update", label: "参数配置-编辑" },
  { key: "users", label: "用户" },
  { key: "users-create", label: "用户-新增" },
  { key: "users-update", label: "用户-编辑" },
  { key: "users-delete", label: "用户-删除" },
  { key: "admins", label: "管理员" },
  { key: "admins-create", label: "管理员-新增" },
  { key: "admins-update", label: "管理员-编辑" },
  { key: "admins-delete", label: "管理员-删除" },
  { key: "admin-types", label: "管理员类型" },
  { key: "admin-types-create", label: "管理员类型-新增" },
  { key: "admin-types-update", label: "管理员类型-编辑" },
  { key: "admin-types-delete", label: "管理员类型-删除" },
  { key: "admin-operation-logs", label: "操作日志" }
];

const PERMISSION_KEYS = new Set(MANAGE_MENU_PERMISSIONS.map((item) => item.key));
const PERMISSION_LABEL_MAP = new Map(MANAGE_MENU_PERMISSIONS.map((item) => [item.key, item.label]));
const PUBLIC_PATHS = new Set(["/user/info", "/logout"]);
const ROUTE_PERMISSION_RULES = [
  { path: "/admin/create", permissions: ["admins-create"], exact: true },
  { path: "/admin/update", permissions: ["admins-update"], exact: true },
  { path: "/admin/delete", permissions: ["admins-delete"], exact: true },
  { path: "/admin/google-auth/setup", permissions: ["admins"], exact: true },
  { path: "/admin/google-auth/bind", permissions: ["admins"], exact: true },
  { path: "/admin/google-auth/unbind", permissions: ["admins"], exact: true },
  { path: "/announcement/create", permissions: ["announcements-create"], exact: true },
  { path: "/announcement/update", permissions: ["announcements-update"], exact: true },
  { path: "/announcement/delete", permissions: ["announcements-delete"], exact: true },
  { path: "/announcement", permissions: ["announcements"] },
  { path: "/admin-type/options", permissions: ["admins", "admin-types"], exact: true },
  { path: "/admin-type/permission-options", permissions: ["admins", "admin-types"], exact: true },
  { path: "/admin-type/list", permissions: ["admin-types"], exact: true },
  { path: "/admin-type/save", permissions: ["admin-types-create", "admin-types-update"], exact: true },
  { path: "/admin-type/delete", permissions: ["admin-types-delete"], exact: true },
  { path: "/admin-type", permissions: ["admin-types"] },
  { path: "/admin-operation-log", permissions: ["admin-operation-logs"] },
  { path: "/asset-token/update", permissions: ["asset-tokens-update"], exact: true },
  { path: "/asset-token", permissions: ["asset-tokens"] },
  { path: "/user-asset-log", permissions: ["user-asset-logs"] },
  { path: "/user-frozen-asset-log", permissions: ["user-frozen-asset-logs"] },
  { path: "/wallet/update", permissions: ["wallets-update"], exact: true },
  { path: "/wallet/create", permissions: ["wallets-create"], exact: true },
  { path: "/wallet-asset/change", permissions: ["wallet-assets-update"], exact: true },
  { path: "/wallet-asset", permissions: ["wallet-assets"] },
  { path: "/wallet", permissions: ["wallets"] },
  { path: "/system-config/wallet-level/update", permissions: ["parameter-config-update"], exact: true },
  { path: "/system-config/investment/update", permissions: ["parameter-config-update"], exact: true },
  { path: "/system-config", permissions: ["parameter-config"] },
  { path: "/user/create", permissions: ["users-create"], exact: true },
  { path: "/user/update", permissions: ["users-update"], exact: true },
  { path: "/user/delete", permissions: ["users-delete"], exact: true },
  { path: "/user", permissions: ["users"] },
  { path: "/admin", permissions: ["admins"] }
];

function normalizePath(value) {
  const path = String(value || "").split("?")[0].trim() || "/";
  return path.length > 1 ? path.replace(/\/+$/u, "") : path;
}

function normalizePermissions(value) {
  let raw = value;

  if (typeof raw === "string") {
    const text = raw.trim();

    if (!text) {
      raw = [];
    } else if (text.startsWith("[")) {
      try {
        raw = JSON.parse(text);
      } catch {
        raw = text.split(",");
      }
    } else {
      raw = text.split(",");
    }
  }

  if (!Array.isArray(raw)) {
    raw = [];
  }

  return [...new Set(
    raw
      .map((item) => String(item || "").trim())
      .filter((item) => PERMISSION_KEYS.has(item))
  )];
}

function serializePermissions(value) {
  return JSON.stringify(normalizePermissions(value));
}

function isEnabledStatus(status) {
  if (status === null || typeof status === "undefined" || status === "") {
    return true;
  }

  return ["1", "true", "enabled", "enable", "normal", "active"].includes(
    String(status).toLowerCase()
  );
}

function isSuperAdmin(admin) {
  return Number(admin?.is_super || 0) === 1;
}

function permissionLabels(permissions) {
  return normalizePermissions(permissions).map((key) => PERMISSION_LABEL_MAP.get(key) || key);
}

function hasPermission(admin, permission) {
  if (isSuperAdmin(admin)) {
    return true;
  }

  const profile = buildAdminPermissionProfile(admin);
  return profile.permissions.includes(permission);
}

function canGrantPermissions(granter, permissions) {
  if (isSuperAdmin(granter)) {
    return true;
  }

  const granterPermissions = buildAdminPermissionProfile(granter).permissions;
  return normalizePermissions(permissions).every((permission) => granterPermissions.includes(permission));
}

async function getAdminTypeById(id, enabledOnly = false) {
  const typeId = Number(id || 0);

  if (!typeId) {
    return null;
  }

  const query = DB.query()
    .table("admin_type")
    .where("id", typeId);

  if (enabledOnly) {
    query.where("status", 1);
  }

  return query.first();
}

async function attachAdminTypeInfo(admin) {
  if (!admin) {
    return null;
  }

  const adminType = await getAdminTypeById(admin.admin_type_id, false);

  return {
    ...admin,
    admin_type_name: adminType?.name || "",
    admin_type_status: typeof adminType?.status === "undefined" ? null : Number(adminType.status || 0),
    admin_type_permissions: adminType ? adminType.permissions : null
  };
}

function buildAdminPermissionProfile(admin) {
  const isSuper = isSuperAdmin(admin);
  const hasType = Number(admin?.admin_type_id || 0) > 0;
  const permissions = isSuper
    ? MANAGE_MENU_PERMISSIONS.map((item) => item.key)
    : normalizePermissions(hasType
      ? (Number(admin?.admin_type_status || 0) === 1 ? admin?.admin_type_permissions : [])
      : admin?.permissions);

  return {
    is_super: isSuper ? 1 : 0,
    role: isSuper ? "super_admin" : "admin",
    admin_type_id: Number(admin?.admin_type_id || 0),
    admin_type_name: admin?.admin_type_name || "",
    permissions,
    permission_labels: permissionLabels(permissions)
  };
}

function resolveRuleForPath(pathValue) {
  const path = normalizePath(pathValue);

  if (PUBLIC_PATHS.has(path)) {
    return null;
  }

  return ROUTE_PERMISSION_RULES.find((rule) => {
    if (rule.exact) {
      return path === rule.path;
    }

    return path === rule.path || path.startsWith(`${rule.path}/`);
  }) || { permissions: [] };
}

async function verifyRequestPermission(req, res, next) {
  try {
    const rule = resolveRuleForPath(req.path || req._parsedOriginalUrl?.pathname || "");

    if (!rule) {
      return next();
    }

    const adminRow = await DB.query()
      .table("admin")
      .where("id", req.auth?.id() || 0)
      .first();
    const admin = await attachAdminTypeInfo(adminRow);

    if (!admin || !isEnabledStatus(admin.status)) {
      return res.send(ApiResult.error(403, "No permission"));
    }

    const profile = buildAdminPermissionProfile(admin);
    req.auth.user = {
      ...(req.auth.user || {}),
      ...profile
    };

    if (profile.is_super) {
      return next();
    }

    if (rule.superOnly) {
      return res.send(ApiResult.error(403, "No permission"));
    }

    const requiredPermissions = req.path === "/admin-type/save"
      ? [Number(req.body?.id || 0) > 0 ? "admin-types-update" : "admin-types-create"]
      : (rule.permissions || []);
    const allowed = requiredPermissions.some((permission) =>
      profile.permissions.includes(permission)
    );

    if (!allowed) {
      return res.send(ApiResult.error(403, "No permission"));
    }

    return next();
  } catch (error) {
    return res.send(ApiResult.exception(error, "ManagePermission.verifyRequestPermission"));
  }
}

export default {
  MANAGE_MENU_PERMISSIONS,
  attachAdminTypeInfo,
  buildAdminPermissionProfile,
  canGrantPermissions,
  getAdminTypeById,
  hasPermission,
  isEnabledStatus,
  isSuperAdmin,
  normalizePermissions,
  permissionLabels,
  serializePermissions,
  verifyRequestPermission
};
