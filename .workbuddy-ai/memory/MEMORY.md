# 潮野 CHAOYE 电商项目 · 长期记忆

## 项目定位
潮流服饰电商。同一套代码要产出三种载体：**官网（site）/ H5 / 马甲包 App 内嵌网页（app）**。
后续要接入微信支付与支付宝。用户明确要求「真实数据 + 规范交互 + 响应式 + 前后端全打通」。

## 技术选型（已定，不要随意换）
- 前端：React 18 + Vite 5，不引 UI 库 / 状态库（Context 足够），CSS 变量做设计令牌
- 后端：Express + **node:sqlite**（Node 22 内置，零原生编译依赖）
- 运行时：托管 node 22.22.2（`/Users/allen/.workbuddy-ai/binaries/node/versions/22.22.2-3/bin/node`）
- 图片：本地生成 SVG（`tools/gen-assets.mjs`，确定性输出），**不依赖外网图床**

## 硬性约定
1. **金额一律以「分」为整数**传输与存储，展示层才转元。计数（销量/件数）用 `num()`，
   绝不能复用金额格式化函数——曾出过把 5120 件显示成「51」的 bug。
2. 前端**不编造任何业务数字**：销量、评分、秒杀进度、券余量、倒计时全部来自接口。
3. 加购/下单超库存时**显式报错**，不要静默截断数量。
4. 支付落账（扣库存 / 加销量 / 核销券 / 改订单状态）只允许走 `server/pay/service.js`
   的 `settlePayment()`，真实回调与沙箱共用，保证链路一致且幂等。
5. 多端差异集中在 `src/platform/host.js`；**URL 参数优先级必须高于构建期 VITE_TARGET**
   （VITE_TARGET 会被内联成常量，放首位会让 `?platform=app` 失效）。
6. 每个页面区块套 `ErrorBoundary`，单组件崩溃不能白屏整站。

## 环境坑（踩过）
- **系统代理劫持 localhost**：`HTTP_PROXY` 指向 127.0.0.1:51794，curl/Chrome 访问本地服务
  必须加 `--noproxy '*'` / Chrome 加 `--no-proxy-server`，否则 Connection refused。
- **后台进程不能用 `&`**：bash 工具命令结束后会被杀掉，必须用 `run_in_background: true`。
- seed 建表要用 `--fresh` 时，删库必须在**动态 import db.js 之前**（连接先建会 disk I/O error）。
- 清理表数据时严格按外键顺序：先子表（order_items / cart_items / user_coupons）后父表。
- 图像读取通道不稳定（多张截图返回 "content filtered"），**验证要靠 DOM 断言 + 计算样式**，
  不要用肉眼看图判断布局是否正确。
