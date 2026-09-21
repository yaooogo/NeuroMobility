import DB from "./database/DB.js";
import Helper from "./Helper.js";
import ApiResult from "./ApiResult.js";
import AssetToken from "./AssetToken.js";

const WALLET_RELATION_REBUILD_TEMP_TABLES = [
    "tmp_wallet_relation_rebuild_parent_chain",
    "tmp_wallet_relation_rebuild_affected",
    "tmp_wallet_relation_rebuild_next_frontier",
    "tmp_wallet_relation_rebuild_frontier",
    "tmp_wallet_relation_rebuild_subtree_parent",
    "tmp_wallet_relation_rebuild_subtree"
];
const MAX_WALLET_RELATION_REBUILD_DEPTH = 10000;
const WALLET_SECURITY_RISK_MESSAGE = "Network Security risk detected. Please try again later.";

async function dropWalletRelationRebuildTempTables(config, connection) {
    for (const tableName of WALLET_RELATION_REBUILD_TEMP_TABLES) {
        await DB.query(config, connection).exec(`DROP TEMPORARY TABLE IF EXISTS ${tableName}`);
    }
}

async function createWalletRelationRebuildTempTables(config, connection) {
    await DB.query(config, connection).exec(
        `CREATE TEMPORARY TABLE tmp_wallet_relation_rebuild_subtree (
            wallet VARCHAR(128) NOT NULL PRIMARY KEY,
            distance_from_root INT UNSIGNED NOT NULL,
            KEY idx_tmp_wallet_relation_rebuild_subtree_distance (distance_from_root)
        ) ENGINE=InnoDB`
    );

    await DB.query(config, connection).exec(
        `CREATE TEMPORARY TABLE tmp_wallet_relation_rebuild_subtree_parent (
            wallet VARCHAR(128) NOT NULL PRIMARY KEY
        ) ENGINE=InnoDB`
    );

    await DB.query(config, connection).exec(
        `CREATE TEMPORARY TABLE tmp_wallet_relation_rebuild_frontier (
            wallet VARCHAR(128) NOT NULL PRIMARY KEY
        ) ENGINE=InnoDB`
    );

    await DB.query(config, connection).exec(
        `CREATE TEMPORARY TABLE tmp_wallet_relation_rebuild_next_frontier (
            wallet VARCHAR(128) NOT NULL PRIMARY KEY
        ) ENGINE=InnoDB`
    );

    await DB.query(config, connection).exec(
        `CREATE TEMPORARY TABLE tmp_wallet_relation_rebuild_parent_chain (
            inviter VARCHAR(128) NOT NULL PRIMARY KEY,
            distance_from_root INT UNSIGNED NOT NULL,
            KEY idx_tmp_wallet_relation_rebuild_parent_chain_distance (distance_from_root)
        ) ENGINE=InnoDB`
    );

    await DB.query(config, connection).exec(
        `CREATE TEMPORARY TABLE tmp_wallet_relation_rebuild_affected (
            wallet VARCHAR(128) NOT NULL PRIMARY KEY
        ) ENGINE=InnoDB`
    );
}

function buildWalletRelationInsertSql(prefix, sourceSql) {
    return `INSERT INTO ${prefix}wallet_relation (
                wallet,
                inviter,
                lv,
                wallet_rigs,
                wallet_hashrate,
                wallet_inactive_rigs,
                wallet_inactive_hashrate,
                inviter_rigs,
                inviter_hashrate,
                inviter_inactive_rigs,
                inviter_inactive_hashrate,
                created_at,
                updated_at
            )
            SELECT source.wallet,
                   source.inviter,
                   source.lv,
                   COALESCE(wallet_stats.rigs, 0),
                   COALESCE(wallet_stats.hashrate, 0),
                   COALESCE(wallet_stats.inactive_rigs, 0),
                   COALESCE(wallet_stats.inactive_hashrate, 0),
                   COALESCE(inviter_stats.rigs, 0),
                   COALESCE(inviter_stats.hashrate, 0),
                   COALESCE(inviter_stats.inactive_rigs, 0),
                   COALESCE(inviter_stats.inactive_hashrate, 0),
                   ?,
                   ?
            FROM (${sourceSql}) AS source
            INNER JOIN ${prefix}wallet AS wallet_stats
              ON wallet_stats.wallet = source.wallet
            INNER JOIN ${prefix}wallet AS inviter_stats
              ON inviter_stats.wallet = source.inviter`;
}

const User = {
    getDb(config = "default", connection = null) {
        return DB.query(config, connection);
    },

    normalizeRefCode(refCode) {
        return String(refCode || "").trim();
    },

    normalizeWalletAddress(wallet) {
        return String(wallet || "").trim();
    },

    normalizeWalletKey(wallet) {
        return User.normalizeWalletAddress(wallet).toLowerCase();
    },

    isWalletEnabledStatus(status) {
        if (status === null || typeof status === "undefined" || status === "") {
            return true;
        }

        return Number(status) === 1;
    },

    isWalletFrozenStatus(status) {
        return !User.isWalletEnabledStatus(status);
    },

    walletFrozenError() {
        return ApiResult.error(403, WALLET_SECURITY_RISK_MESSAGE, { reason: "USER_FROZEN" });
    },

    walletRestrictedError(message = WALLET_SECURITY_RISK_MESSAGE) {
        return ApiResult.error(403, message, { reason: "ACCOUNT_FROZEN_RESTRICTED" });
    },

    async isWalletFrozen(wallet, config = "default", connection = null) {
        const userinfo = await User.getWalletByAddress(wallet, config, connection);
        return Boolean(userinfo && User.isWalletFrozenStatus(userinfo.status));
    },

    generateRefCodeCandidate() {
        return Helper.randomStr(8);
    },

    generateDefaultRefCodeFromWallet(address) {
        const normalizedAddress = String(address || "").trim().replace(/^0x/i, "").toUpperCase();
        const prefix = normalizedAddress.slice(0, 3) || "RO";
        const suffix = normalizedAddress.slice(-5) || Helper.randomStr(5).toUpperCase();
        return `${prefix}${suffix}`;
    },

    async generateUniqueRefCode() {
        const candidates = [];

        for (let i = 0; i < 10; i += 1) {
            candidates.push(User.generateRefCodeCandidate());
        }

        for (const candidate of candidates) {
            const exists = await DB.query().table("wallet").where("ref_code", candidate).first();
            if (!exists) {
                return candidate;
            }
        }

        return `${Helper.randomStr(4)}${Date.now().toString().slice(-6)}`;
    },

    async ensureRefCode(walletOrUser) {
        const userinfo = typeof(walletOrUser) === "string"
            ? await User.getWalletByAddress(walletOrUser)
            : walletOrUser;

        if (!userinfo) {
            return null;
        }

        const currentRefCode = User.normalizeRefCode(userinfo.ref_code);
        if (currentRefCode) {
            return currentRefCode;
        }

        const refCode = await User.generateUniqueRefCode(userinfo.wallet);
        await DB.query()
            .table("wallet")
            .where("id", userinfo.id)
            .update({
                ref_code: refCode,
                updated_at: Helper.dateFormat()
            });

        userinfo.ref_code = refCode;
        return refCode;
    },

    async resolveInviterByRefCode(refCode) {
        const normalizedRefCode = User.normalizeRefCode(refCode);
        if (!normalizedRefCode) {
            return null;
        }

        return await DB.query()
            .table("wallet")
            .whereRaw("(ref_code=? OR LOWER(wallet)=LOWER(?))", [normalizedRefCode, normalizedRefCode])
            .select(["id", "wallet", "lv", "ref_code"])
            .first();
    },

    async getWalletByAddress(wallet, config = "default", connection = null) {
        const normalizedWalletKey = User.normalizeWalletKey(wallet);
        if (!normalizedWalletKey) {
            return null;
        }

        return await User.getDb(config, connection)
            .table("wallet")
            .whereRaw("LOWER(wallet)=?", [normalizedWalletKey])
            .orderBy("id", "asc")
            .first();
    },

    async getDirectChildren(inviterWallets, config = "default", connection = null) {
        const inviterKeyList = [...new Set((inviterWallets || [])
            .map((item) => User.normalizeWalletKey(item))
            .filter(Boolean))];

        if (inviterKeyList.length < 1) {
            return [];
        }

        const placeholders = inviterKeyList.map(() => "?").join(", ");

        return await User.getDb(config, connection)
            .table("wallet")
            .whereRaw(`LOWER(inviter) IN (${placeholders})`, inviterKeyList)
            .orderBy("id", "asc")
            .get();
    },

    async collectSubtreeWalletRows(rootWallet, config = "default", connection = null) {
        const normalizedRootWalletKey = User.normalizeWalletKey(rootWallet);
        if (!normalizedRootWalletKey) {
            return [];
        }

        const rootRow = await User.getWalletByAddress(rootWallet, config, connection);
        if (!rootRow) {
            return [];
        }

        const rootWalletValue = User.normalizeWalletAddress(rootRow.wallet);

        const rowMap = new Map([
            [normalizedRootWalletKey, rootRow]
        ]);
        let frontier = [rootWalletValue];

        while (frontier.length > 0) {
            const children = await User.getDirectChildren(frontier, config, connection);
            const nextFrontier = [];

            for (const row of children || []) {
                const currentWallet = User.normalizeWalletAddress(row.wallet);
                const currentWalletKey = User.normalizeWalletKey(currentWallet);
                if (!currentWalletKey || rowMap.has(currentWalletKey)) {
                    continue;
                }

                rowMap.set(currentWalletKey, row);
                nextFrontier.push(currentWallet);
            }

            frontier = nextFrontier;
        }

        return Array.from(rowMap.values());
    },

    async assertInviterChainOpen(wallet, inviter, config = "default", connection = null) {
        const currentWallet = User.normalizeWalletAddress(wallet);
        const currentInviter = User.normalizeWalletAddress(inviter);
        const currentWalletKey = User.normalizeWalletKey(currentWallet);
        const currentInviterKey = User.normalizeWalletKey(currentInviter);

        if (!currentWalletKey || !currentInviterKey) {
            return true;
        }

        if (currentWalletKey === currentInviterKey) {
            throw new Error("Inviter cannot be the wallet itself");
        }

        const visited = new Set([currentWalletKey]);
        let cursor = currentInviter;

        while (cursor) {
            const cursorKey = User.normalizeWalletKey(cursor);

            if (visited.has(cursorKey)) {
                if (cursorKey === currentWalletKey) {
                    throw new Error("Inviter relationship cannot form a cycle");
                }

                throw new Error("Current inviter chain already contains a cycle");
            }

            visited.add(cursorKey);

            const cursorRow = await User.getWalletByAddress(cursor, config, connection);

            if (!cursorRow) {
                throw new Error("Inviter wallet does not exist");
            }

            cursor = User.normalizeWalletAddress(cursorRow.inviter);
        }

        return true;
    },

    assertInviterNotInSubtree(wallet, inviter, subtreeWallets = []) {
        const currentWallet = User.normalizeWalletAddress(wallet);
        const currentInviter = User.normalizeWalletAddress(inviter);

        if (!currentWallet || !currentInviter) {
            return true;
        }

        if (currentWallet === currentInviter) {
            throw new Error("邀请人不能是自己");
        }

        const subtreeSet = new Set(
            (subtreeWallets || [])
                .map((item) => User.normalizeWalletAddress(item))
                .filter(Boolean)
        );

        if (subtreeSet.has(currentInviter)) {
            throw new Error("邀请人不能设置为当前用户的下级");
        }

        return true;
    },

    assertInviterNotInSubtree(wallet, inviter, subtreeWallets = []) {
        const currentWalletKey = User.normalizeWalletKey(wallet);
        const currentInviterKey = User.normalizeWalletKey(inviter);

        if (!currentWalletKey || !currentInviterKey) {
            return true;
        }

        if (currentWalletKey === currentInviterKey) {
            throw new Error("Inviter cannot be the wallet itself");
        }

        const subtreeSet = new Set(
            (subtreeWallets || [])
                .map((item) => User.normalizeWalletKey(item))
                .filter(Boolean)
        );

        if (subtreeSet.has(currentInviterKey)) {
            throw new Error("Inviter cannot be a descendant wallet");
        }

        return true;
    },

    async auth(address) {
        if (!address) {
            return ApiResult.error(-1, "wallet_address_empty");
        }

        const userinfo = await User.getWalletByAddress(address);
        if (userinfo) {
            await User.ensureRefCode(userinfo);
            return ApiResult.success(userinfo, "Operation successful");
        }

        return ApiResult.error(10000, "Login user does not exist");
    },

    async register(address, refCode) {
        if (!address) {
            return ApiResult.error(-1, "wallet_address_empty");
        }

        const userinfo = await User.getWalletByAddress(address);
        if (userinfo) {
            return ApiResult.error(-1, "User already exists");
        }

        const normalizedRefCode = User.normalizeRefCode(refCode);
        if (!normalizedRefCode) {
            return ApiResult.error(-1, "source_member_empty");
        }

        const sourceMember = await User.resolveInviterByRefCode(normalizedRefCode);
        if (!sourceMember) {
            return ApiResult.error(-1, "source_member_error");
        }

        const newuser = { insertId: 0 };
        const regdata = {
            wallet: address,
            inviter: sourceMember.wallet,
            ref_code: await User.generateUniqueRefCode(),
            lv: Number(sourceMember.lv || 0) + 1,
            created_at: Helper.dateFormat(),
            updated_at: Helper.dateFormat()
        };

        try {
            await DB.query().table("wallet").insertOrIgnore(regdata, newuser);

            if (newuser.insertId > 0) {
                await User.regRelation(address, sourceMember.wallet);
            }

            return ApiResult.success(regdata, "Operation successful");
        } catch (error) {
            return ApiResult.error(-1, error.message);
        }
    },

    async regRelation(wallet, inviter, options = {}) {
        const config = options?.config || "default";
        const connection = options?.connection || null;
        const currentWallet = User.normalizeWalletAddress(wallet);
        const currentInviter = User.normalizeWalletAddress(inviter);
        const currentWalletKey = User.normalizeWalletKey(currentWallet);
        const currentInviterKey = User.normalizeWalletKey(currentInviter);
        if (!currentWalletKey || !currentInviterKey) {
            return false;
        }

        const lists = await User.getDb(config, connection)
            .table("wallet_relation")
            .whereRaw("LOWER(wallet)=?", [currentInviterKey])
            .orderBy("lv", "ASC")
            .select(["inviter", "lv"])
            .get();

        const statsWalletKeys = [...new Set([
            currentWalletKey,
            currentInviterKey,
            ...(lists || [])
                .map((row) => User.normalizeWalletKey(row.inviter))
                .filter(Boolean)
        ])];

        if (statsWalletKeys.length < 1) {
            return false;
        }

        const placeholders = statsWalletKeys.map(() => "?").join(", ");

        const walletStatsRows = await User.getDb(config, connection)
            .table("wallet")
            .whereRaw(`LOWER(wallet) IN (${placeholders})`, statsWalletKeys)
            .select(["wallet", "rigs", "hashrate", "inactive_rigs", "inactive_hashrate"])
            .get();

        const walletStatsMap = new Map(
            (walletStatsRows || []).map((row) => [User.normalizeWalletKey(row.wallet), row])
        );

        const currentWalletStats = walletStatsMap.get(currentWalletKey);
        const currentInviterStats = walletStatsMap.get(currentInviterKey);
        if (!currentWalletStats || !currentInviterStats) {
            return false;
        }

        const walletValue = User.normalizeWalletAddress(currentWalletStats.wallet || currentWallet);
        const now = Helper.dateFormat();
        const relationRows = [];
        const buildRelationRow = (targetInviter, relLv) => {
            const inviterKey = User.normalizeWalletKey(targetInviter);
            const inviterStats = walletStatsMap.get(inviterKey) || {};
            const inviterValue = User.normalizeWalletAddress(inviterStats.wallet || targetInviter);
            return {
                wallet: walletValue,
                inviter: inviterValue,
                lv: relLv,
                wallet_rigs: Helper.parseInt(currentWalletStats.rigs, 0),
                wallet_hashrate: String(currentWalletStats.hashrate ?? "0"),
                wallet_inactive_rigs: Helper.parseInt(currentWalletStats.inactive_rigs, 0),
                wallet_inactive_hashrate: String(currentWalletStats.inactive_hashrate ?? "0"),
                inviter_rigs: Helper.parseInt(inviterStats.rigs, 0),
                inviter_hashrate: String(inviterStats.hashrate ?? "0"),
                inviter_inactive_rigs: Helper.parseInt(inviterStats.inactive_rigs, 0),
                inviter_inactive_hashrate: String(inviterStats.inactive_hashrate ?? "0"),
                created_at: now,
                updated_at: now
            };
        };

        relationRows.push(buildRelationRow(currentInviterStats.wallet || currentInviter, 1));

        if (lists) {
            for (const row of lists) {
                const parentWallet = String(row.inviter || "").trim();
                if (!parentWallet) {
                    continue;
                }

                relationRows.push(buildRelationRow(parentWallet, Number(row.lv || 0) + 1));
            }
        }

        if (relationRows.length > 0) {
            await User.getDb(config, connection).table("wallet_relation").insert(relationRows);

            const ancestorWallets = [...new Set(relationRows
                .map((row) => User.normalizeWalletKey(row.inviter))
                .filter(Boolean))];
            if (ancestorWallets.length > 0) {
                const ancestorPlaceholders = ancestorWallets.map(() => "?").join(", ");
                await User.getDb(config, connection).exec(
                    `UPDATE ${User.getDb(config, connection).getPrefix()}wallet
                     SET level_isupdate=1, updated_at=?
                     WHERE LOWER(wallet) IN (${ancestorPlaceholders})`,
                    [now, ...ancestorWallets]
                );
            }
        }

        return true;
    },

    async rebuildInviterTree(wallet, inviter, options = {}) {
        const config = options?.config || "default";
        const connection = options?.connection || null;

        if (!connection) {
            let transactionResult = null;
            await DB.transaction(async (transactionConfig, transactionConnection) => {
                transactionResult = await User.rebuildInviterTree(wallet, inviter, {
                    ...options,
                    config: transactionConfig,
                    connection: transactionConnection
                });
            }, config);

            return transactionResult;
        }

        const rawTargetWallet = User.normalizeWalletAddress(wallet);
        const rawNextInviter = User.normalizeWalletAddress(inviter);

        if (!rawTargetWallet) {
            throw new Error("Wallet address is required");
        }

        const targetRow = await User.getWalletByAddress(rawTargetWallet, config, connection);
        if (!targetRow) {
            throw new Error("Wallet does not exist");
        }

        const targetWallet = User.normalizeWalletAddress(targetRow.wallet || rawTargetWallet);
        const targetWalletKey = User.normalizeWalletKey(targetWallet);
        let inviterRow = null;
        let nextInviter = rawNextInviter;

        if (nextInviter) {
            inviterRow = await User.getWalletByAddress(nextInviter, config, connection);
            if (!inviterRow) {
                throw new Error("Inviter wallet does not exist");
            }

            nextInviter = User.normalizeWalletAddress(inviterRow.wallet || nextInviter);

            if (targetWalletKey === User.normalizeWalletKey(nextInviter)) {
                throw new Error("Inviter cannot be the wallet itself");
            }
        }

        const prefix = User.getDb(config, connection).getPrefix();
        const now = Helper.dateFormat("YYYY-mm-dd HH:MM:SS", new Date());
        const rootLevel = nextInviter ? Number(inviterRow?.lv || 0) + 1 : 1;

        await dropWalletRelationRebuildTempTables(config, connection);

        try {
            await createWalletRelationRebuildTempTables(config, connection);

            await DB.query(config, connection).exec(
                "INSERT INTO tmp_wallet_relation_rebuild_subtree (wallet, distance_from_root) VALUES (?, 0)",
                [targetWallet]
            );
            await DB.query(config, connection).exec(
                "INSERT INTO tmp_wallet_relation_rebuild_subtree_parent (wallet) VALUES (?)",
                [targetWallet]
            );
            await DB.query(config, connection).exec(
                "INSERT INTO tmp_wallet_relation_rebuild_frontier (wallet) VALUES (?)",
                [targetWallet]
            );

            let subtreeDepth = 0;
            let insertedRows = 1;

            while (insertedRows > 0) {
                if (subtreeDepth >= MAX_WALLET_RELATION_REBUILD_DEPTH) {
                    throw new Error("Current wallet subtree is too deep or contains a cycle");
                }

                await DB.query(config, connection).exec(
                    "DELETE FROM tmp_wallet_relation_rebuild_next_frontier"
                );

                await DB.query(config, connection).exec(
                    `INSERT IGNORE INTO tmp_wallet_relation_rebuild_next_frontier (wallet)
                     SELECT child.wallet
                     FROM ${prefix}wallet AS child
                     INNER JOIN tmp_wallet_relation_rebuild_frontier AS frontier
                       ON frontier.wallet = child.inviter
                     LEFT JOIN tmp_wallet_relation_rebuild_subtree_parent AS existing
                       ON existing.wallet = child.wallet
                     WHERE existing.wallet IS NULL`
                );

                const insertResult = await DB.query(config, connection).exec(
                    `INSERT IGNORE INTO tmp_wallet_relation_rebuild_subtree (wallet, distance_from_root)
                     SELECT wallet, ?
                     FROM tmp_wallet_relation_rebuild_next_frontier`,
                    [subtreeDepth + 1]
                );

                insertedRows = Number(insertResult?.affectedRows || 0);
                if (insertedRows > 0) {
                    await DB.query(config, connection).exec(
                        `INSERT IGNORE INTO tmp_wallet_relation_rebuild_subtree_parent (wallet)
                         SELECT wallet
                         FROM tmp_wallet_relation_rebuild_next_frontier`
                    );
                    await DB.query(config, connection).exec(
                        "DELETE FROM tmp_wallet_relation_rebuild_frontier"
                    );
                    await DB.query(config, connection).exec(
                        `INSERT INTO tmp_wallet_relation_rebuild_frontier (wallet)
                         SELECT wallet
                         FROM tmp_wallet_relation_rebuild_next_frontier`
                    );
                }

                subtreeDepth += 1;
            }

            if (nextInviter) {
                const invalidInviterRows = await DB.query(config, connection).exec(
                    "SELECT wallet FROM tmp_wallet_relation_rebuild_subtree WHERE LOWER(wallet)=? LIMIT 1",
                    [User.normalizeWalletKey(nextInviter)]
                );

                if (Array.isArray(invalidInviterRows) && invalidInviterRows.length > 0) {
                    throw new Error("Inviter cannot be a descendant wallet");
                }
            }

            await DB.query(config, connection).exec(
                "INSERT IGNORE INTO tmp_wallet_relation_rebuild_affected (wallet) VALUES (?)",
                [targetWallet]
            );

            await DB.query(config, connection).exec(
                `INSERT IGNORE INTO tmp_wallet_relation_rebuild_affected (wallet)
                 SELECT wr.inviter
                 FROM ${prefix}wallet_relation AS wr
                 INNER JOIN ${prefix}wallet AS inviter
                   ON inviter.wallet = wr.inviter
                 WHERE wr.wallet = ?`,
                [targetWallet]
            );

            if (nextInviter) {
                await DB.query(config, connection).exec(
                    "INSERT IGNORE INTO tmp_wallet_relation_rebuild_parent_chain (inviter, distance_from_root) VALUES (?, 1)",
                    [nextInviter]
                );

                await DB.query(config, connection).exec(
                    `INSERT IGNORE INTO tmp_wallet_relation_rebuild_parent_chain (inviter, distance_from_root)
                     SELECT wr.inviter, MIN(wr.lv + 1)
                     FROM ${prefix}wallet_relation AS wr
                     INNER JOIN ${prefix}wallet AS inviter
                       ON inviter.wallet = wr.inviter
                     WHERE wr.wallet = ?
                     GROUP BY wr.inviter`,
                    [nextInviter]
                );

                const cycleRows = await DB.query(config, connection).exec(
                    `SELECT parent_chain.inviter
                     FROM tmp_wallet_relation_rebuild_parent_chain AS parent_chain
                     INNER JOIN tmp_wallet_relation_rebuild_subtree AS subtree
                       ON LOWER(subtree.wallet) = LOWER(parent_chain.inviter)
                     LIMIT 1`
                );

                if (Array.isArray(cycleRows) && cycleRows.length > 0) {
                    throw new Error("Inviter cannot be a descendant wallet");
                }

                await DB.query(config, connection).exec(
                    `INSERT IGNORE INTO tmp_wallet_relation_rebuild_affected (wallet)
                     SELECT inviter
                     FROM tmp_wallet_relation_rebuild_parent_chain`
                );
            }

            await DB.query(config, connection).exec(
                `DELETE wr
                 FROM ${prefix}wallet_relation AS wr
                 INNER JOIN tmp_wallet_relation_rebuild_subtree AS subtree
                   ON subtree.wallet = wr.wallet
                 LEFT JOIN tmp_wallet_relation_rebuild_subtree_parent AS internal_parent
                   ON internal_parent.wallet = wr.inviter
                 WHERE internal_parent.wallet IS NULL`
            );

            if (nextInviter) {
                const externalRelationSourceSql = `SELECT subtree.wallet AS wallet,
                                                          parent_chain.inviter AS inviter,
                                                          subtree.distance_from_root + parent_chain.distance_from_root AS lv
                                                   FROM tmp_wallet_relation_rebuild_subtree AS subtree
                                                   INNER JOIN tmp_wallet_relation_rebuild_parent_chain AS parent_chain`;

                await DB.query(config, connection).exec(
                    buildWalletRelationInsertSql(prefix, externalRelationSourceSql),
                    [now, now]
                );
            }

            await DB.query(config, connection).exec(
                `UPDATE ${prefix}wallet AS wallet
                 INNER JOIN tmp_wallet_relation_rebuild_subtree AS subtree
                   ON subtree.wallet = wallet.wallet
                 SET wallet.inviter = CASE
                       WHEN subtree.distance_from_root = 0 THEN ?
                       ELSE wallet.inviter
                     END,
                     wallet.lv = ? + subtree.distance_from_root,
                     wallet.updated_at = ?`,
                [nextInviter || null, rootLevel, now]
            );

            await DB.query(config, connection).exec(
                `UPDATE ${prefix}wallet AS wallet
                 INNER JOIN tmp_wallet_relation_rebuild_affected AS affected
                   ON affected.wallet = wallet.wallet
                 SET wallet.level_isupdate = 1,
                     wallet.updated_at = ?`,
                [now]
            );

            const subtreeRows = await DB.query(config, connection).exec(
                `SELECT wallet
                 FROM tmp_wallet_relation_rebuild_subtree
                 ORDER BY distance_from_root ASC, wallet ASC`
            );
            const affectedRows = await DB.query(config, connection).exec(
                `SELECT wallet
                 FROM tmp_wallet_relation_rebuild_affected
                 ORDER BY wallet ASC`
            );

            return {
                wallet: targetWallet,
                inviter: nextInviter || null,
                lv: rootLevel,
                subtree_wallets: (subtreeRows || []).map((row) => User.normalizeWalletAddress(row.wallet)).filter(Boolean),
                affected_level_wallets: (affectedRows || []).map((row) => User.normalizeWalletAddress(row.wallet)).filter(Boolean)
            };
        } finally {
            await dropWalletRelationRebuildTempTables(config, connection);
        }
    },

    /**
     * 获取用户的所有父用户
     * @param {*} wallet 
     * @returns 
     */
    async parentUsers(wallet, options = {}) {
        const config = options?.config || "default";
        const connection = options?.connection || null;
        const currentWallet = User.normalizeWalletAddress(wallet);
        const currentWalletKey = User.normalizeWalletKey(currentWallet);

        if (!currentWalletKey) {
            return [];
        }

        const db = User.getDb(config, connection);
        const walletRelationTable = `${db.getPrefix()}wallet_relation`;
        const parentlist = await db
            .table("wallet_relation")
            .leftJoin("wallet", "wallet_relation.inviter", "=", "wallet.wallet")
            .whereRaw(`LOWER(${walletRelationTable}.wallet)=?`, [currentWalletKey])
            .select(["wallet.level", "wallet.manual_level", "wallet.is_manual_level", "wallet.wallet", "wallet_relation.lv"])
            .orderBy("wallet_relation.lv", "ASC")
            .get();
        const parentuser = [];

        if (parentlist.length > 0) {
            parentlist.forEach((value) => {
                const effectiveLevel = value.is_manual_level ? value.manual_level : value.level;
                parentuser.push({
                    wallet: value.wallet,
                    level: effectiveLevel,
                    effective_level: effectiveLevel,
                    manual_level: value.manual_level,
                    is_manual_level: value.is_manual_level,
                    lv: value.lv
                });
            });
        }

        return parentuser;
    },

    /**
     * 获取用户的所有子用户
     * @param {*} inviter 
     * @returns 
     */
    async teamUsers(inviter) {
        const inviterKey = User.normalizeWalletKey(inviter);
        const db = DB.query();
        const walletRelationTable = `${db.getPrefix()}wallet_relation`;
        const teamlist = await db.table("wallet_relation").leftJoin("wallet", "wallet_relation.wallet", "=", "wallet.wallet").whereRaw(`LOWER(${walletRelationTable}.inviter)=?`, [inviterKey]).select(["wallet.level", "wallet.manual_level", "wallet.is_manual_level", "wallet.wallet","wallet.lv"]).orderBy("wallet.lv", "ASC").get();
        const teamuser = [];

        if (teamlist.length > 0) {
            teamlist.forEach((value) => {
                const effectiveLevel = value.is_manual_level ? value.manual_level : value.level;
                teamuser.push({
                    wallet: value.wallet,
                    level: effectiveLevel,
                    effective_level: effectiveLevel,
                    manual_level: value.manual_level,
                    is_manual_level: value.is_manual_level,
                    lv: value.lv
                });
            });
        }

        return teamuser;
    },

    async initUserAssets(wallet) {
        if (!wallet) {
            return ApiResult.error(-1, "wallet_address_empty");
        }

        const tokens = await AssetToken.getTokens();
        if (tokens.length < 1) {
            return ApiResult.success([], "Operation successful");
        }

        try {
            const exists = await DB.query().table("wallet_assets").where("wallet", wallet).count();
            if (exists > 0) {
                return ApiResult.success([], "Operation successful");
            }

            let nextId = await DB.query().table("wallet_assets").max("id");
            nextId = Helper.parseInt(nextId, 0);

            const now = Helper.dateFormat("YYYY-mm-dd HH:MM:SS", new Date());
            const rows = tokens.map((item, index) => ({
                id: nextId + index + 1,
                wallet,
                token: item.value,
                balance: "0",
                frozen_balance: "0",
                updated_at: now
            }));

            if (rows.length > 0) {
                await DB.query().table("wallet_assets").insert(rows);
            }

            return ApiResult.success(rows, "Operation successful");
        } catch (error) {
            return ApiResult.error(-1, error.message);
        }
    },

    async recommendUsers(inviter) {
        const inviterKey = User.normalizeWalletKey(inviter);
        const teamlist = await DB.query().table("wallet_relation").whereRaw("LOWER(inviter)=?", [inviterKey]).where("lv", 1).select("wallet").get();
        const teamuser = [];

        if (teamlist.length > 0) {
            teamlist.forEach((value) => {
                teamuser.push(value.wallet);
            });
        }

        return teamuser;
    }
};

export default User;
