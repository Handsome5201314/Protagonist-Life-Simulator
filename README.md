# 🔮 图灵命运大厅 (Turing Destiny Arena)

> 深空赛博玻璃拟物风格的主角人生竞技场与相亲局 —— 文字优先的叙事引擎。

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)](https://www.typescriptlang.org/)

---

## 项目简介

图灵命运大厅是一个基于 Next.js 16 + React 19 构建的叙事驱动型 Web 应用，核心玩法包括：

- **🎭 主角铸造** —— 锁定不可变的人格快照（PersonaSnapshot），外层画像可编辑
- **⚔️ 命运竞技场** —— 异步 4 人竞技，规则引擎决定胜负，AI 只润色叙事
- **💕 塔罗相亲排练** —— 从简历提炼相亲档案，生成对话排练脚本
- **🌍 世界包锻造** —— 上传世界观素材，护栏清洗 + AI 重写摘要/阵营/禁忌
- **🤖 AgentPit + A2A 集成** —— Agent 对战与 Webhook 接入面

---

## ✨ Phase 1: 视觉与外壳重构 (已完成)

### 深空 Glassmorphism 设计系统

- **深空背景**: `#0f0c29` → `#302b63` → `#24243e` 渐变
- **玻璃拟态**: `backdrop-blur-xl` + `bg-white/5` + `border-white/10`
- **霓虹强调**: 粉紫渐变 `#ec4899` → `#a855f7` / 青色 `#22d3ee`
- **字体**: Space Grotesk / Manrope / PingFang SC

### 新增组件

| 组件 | 说明 |
|------|------|
| `PersonaQuickDrawer` | 右侧滑出抽屉，只读展示分身 DNA 五维属性、特征标签、记忆碎片 |

### 重构页面

| 页面 | 变更 |
|------|------|
| `/` (FateLobbyHome) | 深色大厅卡片瀑布流，点击角色头像打开 DNA 抽屉 |
| `/arena/prep/[id]` | 准备室玻璃拟态增强，座位可点击查看分身详情 |
| `/arena/[matchId]` | 主战场心动值/压力条发光效果，点击参与者打开抽屉 |
| 全局导航 | FateSiteHeader 深色玻璃主题，星云背景增强 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router, Webpack) |
| 前端 | React 19, Tailwind CSS 4, Lucide Icons |
| 语言 | TypeScript 5.9 |
| AI | One-API / Gemini 代理（`lib/one-api-gemini.ts`） |
| 数据 | 本地 JSON 存储（`data/app-db.json`） |
| 校验 | Zod 4 |

---

## 页面路由

| 路由 | 说明 |
|------|------|
| `/` | **命运大厅** — 赛季快照、用户中心、竞技房间卡片瀑布流 |
| `/guide` | 用户操作地图 — 架构说明、操作流程、边界说明 |
| `/personas` | **我的分身** — 铸造/导入主角、编辑外层画像、AIliangbiao 同步 |
| `/dating` | **相亲市场** — 1v1 邂逅、心动爆灯、对话排练 |
| `/dating/room/[roomId]` | 相亲房间 — SSE 打字机式对话流、心跳/默契度实时更新 |
| `/arena` | 战局放映厅 — 竞技房间列表、房间预览 |
| `/arena/prep/[id]` | **准备室** — 入座分身编队、极速/沉浸模式选择 |
| `/arena/[matchId]` | **主战场** — SSE 章节流、回合推进、技能装配、围观支持 |
| `/worlds` | 世界锻造 — 上传素材、提炼世界包、安全清洗 |
| `/login` | 用户中心 — AgentPit 授权、钱包、赛季数据 |
| `/auth` | 认证回调 |

---

## 项目结构

```
├── app/                    # Next.js App Router 页面与 API
│   ├── api/                #   API 路由（14+ 个模块）
│   ├── arena/              #   竞技场页面（准备室、主战场）
│   ├── dating/             #   相亲市场页面
│   ├── guide/              #   用户地图页面
│   ├── personas/           #   我的分身页面
│   ├── worlds/             #   世界锻造页面
│   ├── globals.css         #   深空设计令牌
│   ├── layout.tsx          #   根布局（星云背景）
│   └── page.tsx            #   命运大厅首页
├── components/             # React 组件
│   ├── FateLobbyHome.tsx   #   命运大厅卡片瀑布流
│   ├── FateSiteHeader.tsx  #   深空玻璃导航栏
│   ├── PersonaQuickDrawer.tsx  # ⭐ 分身 DNA 抽屉（新增）
│   ├── PersonaVaultPage.tsx    #   分身库管理
│   ├── ArenaPrepRoom.tsx   #   准备室
│   ├── ArenaRoomView.tsx   #   主战场
│   ├── DatingMarketHub.tsx #   相亲市场
│   ├── DatingRoomView.tsx  #   相亲房间
│   ├── arena-room-data.ts  #   战局数据构建
│   └── ...
├── lib/                    # 核心业务逻辑
│   ├── app-service.ts      #   编排层：主角、世界、对局、支持、排练、隐私
│   ├── fate-arena.ts       #   竞技大厅房间构建、座位编排
│   ├── view-models.ts      #   聚合页面数据
│   ├── db.ts               #   读写 data/app-db.json
│   ├── game-engine.ts      #   分数、淘汰、胜者、奖励结算
│   ├── dating.ts           #   相亲排练回退逻辑
│   ├── dating-market.ts    #   相亲市场逻辑
│   ├── llm-features.ts     #   Gemini 重写世界/排练/章节
│   ├── one-api-gemini.ts   #   One-API / Gemini 代理封装
│   ├── guardrails.ts       #   世界包风险指令清洗
│   ├── agentpit.ts         #   AgentPit 集成
│   ├── ai-liangbiao.ts     #   AI 量表数据绑定
│   ├── catalog.ts          #   目录/枚举
│   ├── seed-data.ts        #   种子数据
│   ├── i18n.ts / i18n-server.ts  # 国际化
│   ├── types.ts            #   类型定义
│   └── utils.ts            #   工具函数
├── data/
│   └── app-db.json         # 本地 JSON 数据库
└── package.json
```

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

然后访问 `http://localhost:3000`。

---

## 环境变量

复制 `.env.example` 到 `.env.local`：

```bash
cp .env.example .env.local
```

| 变量 | 说明 | 必填 |
|------|------|------|
| `AILIANGBIAO_BASE_URL` | AI 量表服务地址 | 否（未设置时回退内置原型数据） |
| `AILIANGBIAO_PARTNER_TOKEN` | AI 量表合作方令牌 | 否 |
| `AGENTPIT_CLIENT_ID` | AgentPit 客户端 ID | 否 |
| `AGENTPIT_CLIENT_SECRET` | AgentPit 客户端密钥 | 否 |
| `AGENTPIT_WEBHOOK_SECRET` | AgentPit Webhook 签名密钥 | 否 |
| `ONE_API_BASE_URL` | One-API 网关地址（含 `/v1`） | 是（AI 功能依赖） |
| `ONE_API_KEY` | One-API 密钥（以 `sk-` 开头） | 是（AI 功能依赖） |
| `ONE_API_GEMINI_MODEL` | 文本生成模型名 | 是 |
| `ONE_API_GEMINI_VISION_MODEL` | 视觉分析模型名 | 是 |

---

## One-API / Gemini 代理

`lib/one-api-gemini.ts` 封装了 OpenAI 兼容网关，支持：

- 文本生成（`generateText`）
- 多轮对话（`chat`）
- 流式对话（`streamChat`）
- 图片分析（`analyzeImage` / `analyzeImageToJson`）

### 代码示例

```ts
import { createOneApiGeminiProxy } from "@/lib/one-api-gemini";

const proxy = createOneApiGeminiProxy();

// 文本生成
const text = await proxy.generateText("用三句话介绍图灵命运大厅");

// 多轮对话
const reply = await proxy.chat(
  [{ role: "user", content: "帮我写一个相亲局开场白" }],
  { systemPrompt: "你是一个擅长恋爱排练的写作教练" }
);
```

### 测试接口

```bash
# 文本生成
curl -X POST http://localhost:3000/api/llm/test \
  -H "Content-Type: application/json" \
  -d '{"mode":"generate","prompt":"用三句话介绍图灵命运大厅"}'

# 多轮对话
curl -X POST http://localhost:3000/api/llm/test \
  -H "Content-Type: application/json" \
  -d '{"mode":"chat","systemPrompt":"你是恋爱排练顾问","messages":[{"role":"user","content":"给我写一句自然的相亲开场白"}]}'
```

---

## API 端点

### 主角与绑定

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/bind/ailiangbiao/complete` | AI 量表绑定完成回调 |
| POST | `/api/personas/import` | 导入/铸造主角快照 |
| POST | `/api/personas/:personaId/overlay` | 保存分身外层画像 |

### 竞技场

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/matches` | 创建对局 |
| POST | `/api/matches/:matchId/support` | 支持角色（消耗 Renown） |
| POST | `/api/matches/:matchId/rounds/:round/trigger` | 触发回合推进 |
| POST | `/api/matches/:matchId/prep` | 保存准备室编排 |
| GET | `/api/streams/:streamId` | 获取章节 SSE 流 |

### 相亲排练

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/dating/dossiers` | 提炼相亲档案 |
| POST | `/api/dating/matches` | 创建相亲对局 |
| POST | `/api/dating/matches/:roomId/interact` | 执行互动动作 |
| GET | `/api/dating/streams/:streamId` | 获取对话 SSE 流 |

### 世界包

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/worldpacks/upload` | 上传世界包素材 |

### AgentPit / A2A

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agentpit/openapi` | AgentPit OpenAPI 描述 |
| GET | `/api/agentpit/skill` | AgentPit 技能声明 |
| POST | `/api/agentpit/webhooks` | AgentPit Webhook 接收 |
| POST | `/api/a2a/create-match` | A2A 创建对局 |
| POST | `/api/a2a/submit-turn` | A2A 提交回合 |
| GET | `/api/a2a/state` | A2A 查询状态 |
| GET | `/api/a2a/health` | A2A 健康检查 |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/privacy/delete-me` | 隐私删除请求 |
| POST | `/api/llm/test` | LLM 代理测试 |

---

## 核心设计

### 规则引擎 vs AI

| 职责 | 执行者 | 说明 |
|------|--------|------|
| 资格判断、分数、淘汰、奖励结算、记忆碎片生成 | **规则引擎** | 公平性关键，不依赖 AI |
| 世界包摘要重写、相亲排练文案、章节润色 | **Gemini** | 仅叙事增强，在结果固定后执行 |

### 经济系统

- **Renown（声望）** — 唯一可公开支持角色的货币
- **Diamonds（钻石）** — 在钱包模型中可见，用于技能发动
- **Season Points（赛季点）** — 赛季排名依据

### 数据与隐私

- 上传的简历和世界素材缓存在 `data/app-db.json`，TTL 自动清理
- 主角删除会幽灵化公开记录，并从本地演示数据中移除 PII
- 主角快照（PersonaSnapshot）创建后锁定不可变，外层画像（PersonaOverlay）可编辑

---

## 脚本命令

```bash
npm run dev        # 启动开发服务器
npm run build      # 生产构建
npm run start      # 启动生产服务器
npm run typecheck  # 类型检查
```

---

## 架构演进路线图

| 阶段 | 状态 | 内容 |
|------|------|------|
| **Phase 1** | ✅ 已完成 | 视觉与外壳重构 — 深空 glassmorphism、PersonaQuickDrawer |
| Phase 2 | 📝 计划中 | 引擎 & BFF 桥接 — Python FastAPI 游戏引擎、SSE 流桥接 |
| Phase 3 | 📝 计划中 | 核心循环集成 — 多 Agent 编排、裁判/叙事者分离 |
| Phase 4 | 📝 规划中 | 经济 & 多人 — 赛季系统、多人实时观战 |

---

## 许可证

MIT License

---

## Production Deployment

The current production server is:

- `https://xiaozhiserver.cloud`
- `http://xiaozhiserver.cloud` will redirect to HTTPS

The app is deployed as:

- App directory: `/home/ubuntu/apps/turing-destiny-arena/current`
- Internal app port: `3001`
- Public entry: `nginx :80 -> 127.0.0.1:3001`
- TLS: `Let's Encrypt` via `certbot`, auto-renew enabled
- Process supervisor: `systemd` service `turing-destiny-arena.service`

### One-Command Deploy Script

Use the local deploy helper:

```bash
python scripts/deploy_production.py \
  --host 129.211.70.41 \
  --username ubuntu \
  --password 'YOUR_PASSWORD' \
  --server-name xiaozhiserver.cloud
```

Optional flags:

- `--skip-nginx`: only update the app service, do not touch nginx
- `--app-port 3001`: change internal service port
- `--base-dir /home/ubuntu/apps/turing-destiny-arena`: change remote install directory

### Server Notes

- The current nginx site config lives at `/etc/nginx/sites-available/turing-destiny-arena`
- The current systemd unit lives at `/etc/systemd/system/turing-destiny-arena.service`
- There is an older unrelated root-owned service still listening on `3000`; this project now runs independently on `3001`
- Future redeploys should prefer `--skip-nginx` so the existing Certbot-managed HTTPS config is preserved

## Python Engine Bridge

The repo now includes a Python dual-engine backend bootstrap:

- `main.py`
- `core/referee.py`
- `core/orchestrator.py`
- `requirements.engine.txt`

### Local startup

```bash
pip install -r requirements.engine.txt
uvicorn main:app --reload --port 8000
```

### Next.js BFF proxy

The Next.js layer now exposes:

```text
POST /api/interact
```

Expected request shape:

```json
{
  "roomId": "room_xxx",
  "action": "FLIRT",
  "sourceDna": {
    "social_energy": 0.66,
    "empathy_resonance": 0.58,
    "rational_logic": 0.62,
    "stress_resilience": 0.71,
    "behavioral_flexibility": 0.44
  },
  "targetDna": {
    "social_energy": 0.52,
    "empathy_resonance": 0.73,
    "rational_logic": 0.49,
    "stress_resilience": 0.61,
    "behavioral_flexibility": 0.57
  },
  "traits": [
    {
      "id": "T001:反PUA雷达",
      "modifier": -0.08,
      "applies_to": ["FLIRT", "SEDUCE"]
    }
  ],
  "locale": "zh"
}
```

It forwards to:

```text
POST http://127.0.0.1:8000/engine/trigger
```

and returns `text/event-stream` back to the browser.
