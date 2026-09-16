# NeuroMobility 管理后台

当前提供管理员登录、管理员管理、管理员类型、操作日志、资产管理，以及参数配置中的等级配置。

运行 API：

```powershell
cd G:\GitHub\NeuroMobility\api
node ManageServer.js
```

运行后台：

```powershell
cd G:\GitHub\NeuroMobility\manage
npm install
npm run serve_local
```

浏览器打开 `http://localhost:5174/login`。默认 API 地址是 `http://127.0.0.1:3001`；需要修改时，在 `manage/.env.local` 设置 `VITE_MANAGE_API_BASE`。登录使用数据库中已有的管理员账号。
