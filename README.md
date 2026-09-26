# 潮野 CHAOYE · 潮流服饰电商

一套完整可跑通的电商工程：**React + Vite 前端** / **Express + SQLite 后端**，
数据真实、接口规范、响应式适配，并预留微信支付与支付宝接入位。

---

## 一、快速开始

```bash
# 1. 安装依赖
npm install

# 2. 生成商品图素材（SVG，离线可用）
npm run assets

# 3. 初始化数据库并灌入业务数据
npm run seed        # 追加播种
npm run seed:fresh  # 清空后重建

# 4. 启动（两个终端，或后台各起一个）
npm run server      # 后端 :8787
npm run dev         # 前端 :5173（已配置 /api 代理到 8787）

# 打开 http://127.0.0.1:5173
```

只想验证后端：`npm run seed && npm run server && npm run verify`

生产模式（后端同时托管前端产物，单源部署）：

```bash
npm run build:site
npm run serve       # NODE_ENV=production，访问 :8787
```

---

## 二、目录结构

```
.
├── server/                    后端
│   ├── index.js               Express 应用、中间件、错误处理、静态托管
│   ├── db.js                  SQLite 连接（node:sqlite）+ 表结构 + 单号/事务工具
│   ├── config.js              运营规则（包邮门槛、运费、状态机）
│   ├── util.js                响应包络、业务错误码、参数校验
│   ├── seed.js                业务数据播种
│   ├── verify.mjs             后端端到端冒烟测试（13 项）
│   ├── routes/                meta / products / cart / orders / coupons / payments
│   └── pay/
│       ├── gateway.js         渠道注册表 + 沙箱判定
│       ├── wechat.js          微信 Native 支付 API v3（真实 + 沙箱）
│       ├── alipay.js          支付宝当面付（真实 + 沙箱）
│       └── service.js         支付落账（下单/回调/扣库存/核销券）
│
├── src/                       前端
│   ├── api/                   client.js（包络/错误/令牌）+ services.js（接口清单）
│   ├── hooks/useRequest.js    数据请求 / 轮询
│   ├── store/AppStore.jsx     购物车、Toast、弹层编排
│   ├── platform/host.js       宿主识别：官网 / H5 / 内嵌 App
│   ├── utils/money.js         金额与计数格式化（分 ↔ 元）
│   │
│   ├── pages/                 ★ 页面（路由级）
│   │   ├── HomePage.jsx       首页
│   │   ├── home/sections/     首页专属区块（轮播/品类/热门/促销/服务保障）
│   │   ├── ListPage.jsx       列表：品类·价格·排序·搜索多维筛选 + 加载更多
│   │   ├── DetailPage.jsx     详情：图集·SKU·尺码表·参数·评价
│   │   ├── CartPage.jsx       购物车（服务端存储 + 库存告警）
│   │   ├── OrdersPage.jsx     订单列表（按状态筛选）
│   │   ├── OrderDetailPage.jsx 订单详情
│   │   ├── CouponsPage.jsx    优惠券中心 + 我的券包
│   │   ├── MinePage.jsx       我的
│   │   ├── NotFoundPage.jsx   404
│   │   └── pages.css          页面级样式（组件样式随组件走）
│   │
│   └── components/            ★ 公共通用组件
│       ├── Header / Footer / MobileTabBar        外壳
│       ├── ProductCard / Gallery / ReviewList    商品展示
│       ├── Price / QuantityStepper               基础原子
│       ├── SkuPicker / CheckoutSheet / PaymentSheet  全局弹层
│       └── State / ErrorBoundary / Toast / Icons 状态与图标
│
├── public/img/                实拍风格商品图（AI 生成，棚拍白底）
│   ├── products/p01–p24.jpg   商品主图 800×1200
│   ├── categories/c1–c8.jpg   品类图 600×600
│   └── banners/b1–b4.jpg      轮播大图 1600×1024
│
├── tools/
│   ├── gen-assets.mjs         兜底 SVG 素材生成器（离线可用）
│   └── classify-images.mjs    生成图按主色归类（解决并行生成文件名撞车）
└── .env.site / .env.h5 / .env.app    三端构建配置
```

### 路由

采用 **HashRouter**：内嵌 App 常以 `file://` 或任意子路径加载，Hash 路由不依赖服务端重写规则，
一套产物可直接跑在官网、H5 与壳应用里。

| 路径 | 页面 |
|---|---|
| `/` | 首页 |
| `/list?category=&q=&sort=&price=` | 列表 / 搜索 |
| `/product/:id` | 商品详情 |
| `/cart` | 购物车 |
| `/orders` · `/order/:orderNo` | 订单列表 / 详情 |
| `/coupons` · `/mine` | 优惠券中心 / 我的 |

---

## 三、数据：真实在哪里

不是写死的文案，而是**互相能对上账的记录**：

| 字段 | 来源 | 说明 |
|---|---|---|
| 价格 / 划线价 | `products.price`（**单位：分**） | 全链路以分传输，杜绝浮点误差 |
| 已售 | `products.sales` | 支付成功后由 `settlePayment` 累加 |
| 评分 / 评价数 | `rating_sum / rating_count` | 种子评价写入时同步累加 |
| 秒杀进度 | `sold / total_stock` | 前端不再出现写死的「已抢 76%」 |
| 优惠券余量 | `total - issued` | 领完即止，带并发防超发 |
| 库存 / 断码 | `product_skus.stock` | 部分尺码 0 库存，真实断码 |
| 倒计时 | 服务端 `endAt` + `serverTime` | 校准本地时钟偏移，改系统时间无效 |

商品规模：8 品类 / 24 SPU / 247 SKU（颜色 × 尺码 × 库存）/ 96 条评价，
每个 SPU 带面料成分、产地、洗涤说明与尺码表。

> 商品图为本地生成的确定性 SVG 剪影（`tools/gen-assets.mjs`），
> 图片地址是数据库里的普通字段（`products.image`），换成真实 CDN 照片只需改这一列。

---

## 四、接口规范

统一包络，业务错误码与 HTTP 状态码配合：

```jsonc
// 成功
{ "code": 0, "message": "ok", "data": { ... }, "requestId": "a1b2c3d4", "ts": 1790000000000 }
// 失败
{ "code": 40901, "message": "库存不足：该款式仅剩 3 件", "detail": null, "requestId": "..." }
```

| 错误码 | 含义 |
|---|---|
| 40000 | 参数错误 |
| 40100 | 无权访问该资源 |
| 40400 | 资源不存在 |
| 40901 | 库存不足 / 已售罄 |
| 40902 | 优惠券不可用 |
| 40903 | 订单状态不允许该操作 |
| 50000 | 服务内部错误 |

主要接口（前缀 `/api/v1`）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/meta/banners` | 轮播 |
| GET | `/meta/categories` | 品类（含在售数量） |
| GET | `/meta/coupons` | 优惠券（含余量） |
| GET | `/meta/flash-sale` | 秒杀场次（含服务端时间） |
| GET | `/meta/guarantees` | 服务保障文案 |
| GET | `/meta/pay-channels` | 可用支付渠道 |
| GET | `/products?category=&sort=&q=&page=&pageSize=` | 商品列表（分页） |
| GET | `/products/:id` | 详情（SKU / 尺码表 / 评价预览） |
| GET | `/products/:id/reviews` | 评价列表（含评分分布） |
| GET/POST | `/cart` · `/cart/items` | 购物车查询 / 加购 |
| PATCH/DELETE | `/cart/items/:id` | 改数量 / 移除 |
| POST | `/coupons/:code/claim` · GET `/coupons/mine` | 领券 / 我的券包 |
| GET | `/orders/preview` | 结算预览（运费、可用券） |
| POST | `/orders` · GET `/orders/:orderNo` · POST `/orders/:orderNo/cancel` | 订单 |
| POST | `/payments` | 拉起支付（返回二维码） |
| GET | `/payments/:paymentNo/status` | 轮询支付结果 |
| POST | `/pay/notify/wechat` · `/pay/notify/alipay` | 渠道异步回调 |

关键约束：

- **金额一律以分为单位**，结算金额由服务端按数据库现价计算，不信任前端传价；
- 匿名会话用 `x-cart-token` 请求头隔离购物车与订单（后续换成登录态只需替换取值处）；
- 订单状态机集中在 `server/config.js`，非法流转直接拒绝。

---

## 五、支付接入

`server/pay/` 已把渠道差异收拢成两个动作：`createPayment` 与 `handleNotify`。
**未配置商户凭证时自动降级为沙箱模式**，用与真实回调完全相同的落账函数跑通链路。

沙箱模式（默认，无需任何配置）：

```bash
npm run dev
# 下单 → 支付弹层 → 扫码 → 点「模拟支付成功」→ 订单变已支付
```

切换真实模式，在环境变量里配齐商户凭证后重启后端即可：

```bash
# 微信支付 Native（API v3）
export WECHAT_PAY_APPID=wx...
export WECHAT_PAY_MCHID=1234567890
export WECHAT_PAY_SERIAL_NO=5157F09EFDC096DE15EBE81A47057A72
export WECHAT_PAY_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'
export WECHAT_PAY_APIV3_KEY=...（32 位）

# 支付宝 当面付（trade.precreate）
export ALIPAY_APP_ID=202100...
export ALIPAY_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'
export ALIPAY_PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----'
```

已实现的部分：

- 微信：`WECHATPAY2-SHA256-RSA2048` 请求签名、下单接口、回调 AES-256-GCM 解密；
- 支付宝：RSA2 参数签名、`alipay.trade.precreate`、回调验签；
- 共用：支付单创建、二维码生成（`qrcode`）、**幂等落账**、
  支付成功后扣库存 + 加销量 + 核销优惠券，全部在同一事务内。

上线前需要补的两件事（真实模式）：

1. 微信回调需校验平台证书签名（`pay/wechat.js` 已留扩展点）；
2. 配置公网可访问的 `notify_url`（内网穿透可用 ngrok 等）。

---

## 六、一套代码 → 官网 / H5 / 内嵌 App

三种载体的差异全部收敛到**构建模式**与 `src/platform/host.js`：

```bash
npm run build:site    # 官网：根路径 / ，完整 Header + Footer
npm run build:h5      # H5 ：相对路径 ./ ，底部 TabBar，可放任意子目录或 CDN
npm run build:app     # 内嵌：相对路径，去掉自有 Header/Footer，走原生导航
```

| 能力 | site | h5 | app |
|---|---|---|---|
| 资源路径 | `/` | `./` | `./` |
| 顶部导航 / 页脚 | ✅ | ✅ | ❌（原生承担） |
| 底部 TabBar | ❌ | ✅ | ✅ |
| 安全区适配 | — | ✅ | ✅ |

判定优先级：**构建模式 `VITE_TARGET` > URL 参数 `?platform=app` > 宿主注入 `window.CHAOYE_BRIDGE` > UA 推断**。
调试内嵌效果不用重新打包，直接访问 `http://127.0.0.1:5173/?platform=app` 即可。

### 与壳应用（马甲包）对接

宿主在 WebView 注入桥对象即可：

```js
window.CHAOYE_BRIDGE = {
  cartToken: 'app-user-xxx',      // 可选：复用原生登录态，购物车与原生端打通
  onWebEvent(event, payload) {},  // 网页 → 原生
}
```

网页侧已实现 `platform.notifyHost()`，同时兼容 iOS `webkit.messageHandlers` 与 Android `postEvent`。
目前默认派发 `ready` 事件，接支付/登录/分享时按同样的事件名扩展即可。

---

## 七、验证

```bash
npm run verify   # 后端 13 项：加购/超卖/领券/下单/支付/幂等/扣库存
```

前端 33 项（含真实点击走完下单支付、三档断点栅格列数、内嵌模式外壳裁剪）
由 CDP 驱动的脚本完成，会检查 DOM 结构与计算样式而非截图比对。

已覆盖的交互规范：加购超量**显式报错**而非静默截断；库存变化在购物车即提示；
结算金额服务端锁价；支付回调幂等（重复回调不会重复扣库存）。

---

## 八、已知边界

- 商品图为生成 SVG，非实拍照片；换真实图片只需改 `products.image`。
- 匿名令牌存在 `localStorage`，尚未接入账号体系（替换 `getCartToken()` 即可）。
- 未做订单发货 / 退款流程与后台管理端；状态机已预留 `shipped / completed / refunded`。
- 图片未做 OSS/CDN 上传与裁剪，生产环境建议前置对象存储。
