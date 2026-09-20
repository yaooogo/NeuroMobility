import express from 'express';
import ManageAuth from '../Util/ManageAuth.js';
import ManageOperationLog from '../Util/ManageOperationLog.js';
import AuthService from '../services/Manage/AuthService.js';
import AdminService from '../services/Manage/AdminService.js';
import AdminTypeService from '../services/Manage/AdminTypeService.js';
import OperationLogService from '../services/Manage/OperationLogService.js';
import AssetTokenService from '../services/Manage/AssetTokenService.js';
import AssetLogService from '../services/Manage/AssetLogService.js';
import SystemConfigService from '../services/Manage/SystemConfigService.js';
import WalletService from '../services/Manage/WalletService.js';
import AnnouncementService from '../services/Manage/AnnouncementService.js';
import HelpArticleService from '../services/Manage/HelpArticleService.js';
import AboutContentService from '../services/Manage/AboutContentService.js';
import VehicleService from '../services/Manage/VehicleService.js';

import ApiResult from '../Util/ApiResult.js';
import Upload from '../Util/Upload.js';
import multer from 'multer';
const router = express.Router()
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Upload.getMaxImageUploadBytes()
  }
});

function singleImage(fieldName) {
  return (req, res, next) => {
    imageUpload.single(fieldName)(req, res, (error) => {
      if (error) {
        return res.send(ApiResult.error(400, error.message || "Upload failed"));
      }

      return next();
    });
  };
}


router.route('/login-config').post(AuthService.loginConfig)
router.route('/login').post(AuthService.login)

//以下为需要鉴权部分API
router.route('*').all(ManageAuth.verifyToken)
router.route('*').all(ManageOperationLog.capture)
router.route('/user/info').post(AuthService.info)
router.route('/logout').post(AuthService.logout)
router.route('*').all(ManageAuth.verifyPermission)

// 管理员
router.route('/admin/list').post(AdminService.list)
router.route('/admin/detail').post(AdminService.detail)
router.route('/admin/create').post(AdminService.create)
router.route('/admin/update').post(AdminService.update)
router.route('/admin/delete').post(AdminService.remove)
router.route('/admin/options').post(AdminTypeService.all)
router.route('/admin/google-auth/setup').post(AdminService.googleAuthSetup)
router.route('/admin/google-auth/bind').post(AdminService.googleAuthBind)
router.route('/admin/google-auth/unbind').post(AdminService.googleAuthUnbind)

// 公告管理
router.route('/announcement/list').post(AnnouncementService.list)
router.route('/announcement/create').post(AnnouncementService.create)
router.route('/announcement/update').post(AnnouncementService.update)
router.route('/announcement/delete').post(AnnouncementService.remove)
router.route('/announcement/upload-cover').post(singleImage('cover'), AnnouncementService.uploadCover)

// 帮助中心
router.route('/help-article/list').post(HelpArticleService.list)
router.route('/help-article/create').post(HelpArticleService.create)
router.route('/help-article/update').post(HelpArticleService.update)
router.route('/help-article/delete').post(HelpArticleService.remove)

// 关于我们
router.route('/about/list').post(AboutContentService.list)
router.route('/about/create').post(AboutContentService.create)
router.route('/about/update').post(AboutContentService.update)
router.route('/about/delete').post(AboutContentService.remove)

// 车辆详情
router.route('/vehicle/list').post(VehicleService.list)
router.route('/vehicle/create').post(VehicleService.create)
router.route('/vehicle/update').post(VehicleService.update)
router.route('/vehicle/delete').post(VehicleService.remove)
router.route('/vehicle/upload-image').post(singleImage('image'), VehicleService.uploadImage)

// 管理员类型
router.route('/admin-type/list').post(AdminTypeService.list)
router.route('/admin-type/detail').post(AdminTypeService.detail)
router.route('/admin-type/save').post(AdminTypeService.save)
router.route('/admin-type/delete').post(AdminTypeService.remove)
router.route('/admin-type/options').post(AdminTypeService.all)
router.route('/admin-type/permission-options').post(AdminTypeService.permissionOptions)

// 操作日志
router.route('/admin-operation-log/list').post(OperationLogService.list)
router.route('/admin-operation-log/detail').post(OperationLogService.detail)
router.route('/admin-operation-log/path-options').post(OperationLogService.pathOptions)

// 资产类型与资产流水
router.route('/asset-token/list').post(AssetTokenService.list)
router.route('/asset-token/update').post(AssetTokenService.update)
router.route('/user-asset-log/list').post(AssetLogService.list)
router.route('/user-frozen-asset-log/list').post(AssetLogService.frozenList)

// 钱包与钱包资产
router.route('/wallet/list').post(WalletService.walletList)
router.route('/wallet/create').post(WalletService.walletCreate)
router.route('/wallet/update').post(WalletService.walletUpdate)
router.route('/wallet-asset/list').post(WalletService.walletAssetList)
router.route('/wallet-asset/change').post(WalletService.walletAssetChange)

// 参数配置 - 等级配置
router.route('/system-config/wallet-level').post(SystemConfigService.walletLevelDetail)
router.route('/system-config/wallet-level/update').post(SystemConfigService.walletLevelUpdate)
router.route('/system-config/investment').post(SystemConfigService.investmentDetail)
router.route('/system-config/investment/update').post(SystemConfigService.investmentUpdate)


export default router;
