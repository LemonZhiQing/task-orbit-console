# TaskOrbit 任务中枢

基于 Vue 3 + Vite 构建的任务管理控制台，现已内置本地任务 API 服务，可直接读写 SQLite 数据库。

## 数据库位置

默认数据库目录由 [`.env`](.env) 中的 `TASK_DB_DIR` 指定：

- `F:/vcp/VCPToolBox/VCPTaskData`

实际数据库文件：

- `F:/vcp/VCPToolBox/VCPTaskData/tasks.db`

## 开发命令

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run start:server`

## 本地 API 服务

本项目内置的任务服务入口是 [`server/index.cjs`](server/index.cjs)，当前默认监听 `6105` 端口。

主要模块：

- [`server/index.cjs`](server/index.cjs)：Express 服务入口
- [`server/taskApi.cjs`](server/taskApi.cjs)：任务 REST API
- [`server/taskDb.cjs`](server/taskDb.cjs)：SQLite 读写封装

接口路径：

- `/api/tasks`
- `/health`

## 启动方式

执行 [`npm run dev`](package.json:7) 后会同时启动：

- Vite 前端开发服务
- 本地任务 API 服务（默认 `6105`）

前端通过 [`vite.config.js`](vite.config.js) 的代理将 `/api` 转发到本地任务服务。
