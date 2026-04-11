# 主角人生模拟器（Hero Life Arena）

> 深空赛博玻璃拟物风格的主角人生竞技场与相亲局 —— 文字优先的 MVP。

## 项目简介

主角人生模拟器是一个基于 Next.js 16 构建的 Web 应用，核心玩法包括：

- **主角铸造** —— 锁定不可变的人格快照（PersonaSnapshot），外层画像可编辑
- **命运竞技场** —— 异步 4 人竞技，规则引擎决定胜负，AI 只润色叙事
- **塔罗相亲排练** —— 从简历提炼相亲档案，生成对话排练脚本
- **世界包锻造** —— 上传世界观素材，护栏清洗 + AI 重写摘要/阵营/禁忌
- **AgentPit + A2A 集成** —— Agent 对战与 Webhook 接入面

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router, Webpack) |
| 前端 | React 19, Tailwind CSS 4, Lucide Icons |
| 语言 | TypeScript 5.9 |
| AI | One-API / Gemini 代理（`lib/one-api-gemini.ts`） |
| 数据 | 本地 JSON 存储（`data/app-db.json`） |
| 校验 | Zod 4 |

## 页面路由

| 路由 | 说明 |
|------|------|
| `/` | 首页大厅 — 赛季快照、用户中心、竞技房间列表 |
| `/guide` | 用户操作地图 — 架构说明、操作流程、边界说明 |
| `/personas` | 主角库 — 铸造/导入主角、编辑外层画像 |
| `/arena` | 竞技控制台 — 创建/加入对局、支持角色、装配技能 |
| `/arena/[matchId]` | 房间详情 — SSE 打字机式章节流、回合推进 |
| `/dating` | 相亲排练 — 模式选择、档案分析、对话脚本 |
| `/worlds` | 世界锻造 — 上传素材、提炼世界包、安全清洗 |
| `/admin` | 后台诊断 — 模型连通性测试 |
| `/login` | 登录面板 |
| `/auth` | 认证回调 |

## 项目结构

```
├── app/                    # Next.js App Router 页面与 API
│   ├── api/                #   API 路由（13 个模块）
│   ├── arena/              #   竞技场页面
│   ├── dating/             #   相亲排练页面
│   ├── guide/              #   用户地图页面
│   ├── personas/           #   主角库页面
│   ├── worlds/             #   世界锻造页面
│   └── ...
├── components/             # React 组件
│   ├── ArenaControlHub.tsx
│   ├── ArenaRoomView.tsx
│   ├── DatingMarketHub.tsx
│   ├── DatingRoomView.tsx
│   ├── PersonaStudioClient.tsx
│   ├── WorldForgeHub.tsx
│   ├── FateSiteHeader.tsx
│   └── ...
├── lib/                    # 核心业务逻辑
│   ├── app-service.ts      #   编排层：主角、世界、对局、支持、排练、隐私
│   ├── view-models.ts      #   聚合页面数据
│   ├── db.ts               #   读写 data/app-db.json
│   ├── game-engine.ts      #   分数、淘汰、胜者、奖励结算
│   ├── guardrails.ts       #   世界包风险指令清洗
│   ├── dating.ts           #   规则型相亲排练回退
│   ├── dating-market.ts    #   相亲市场逻辑
│   ├── llm-features.ts     #   Gemini 重写世界/排练/章节
│   ├── one-api-gemini.ts   #   One-API / Gemini 代理封装
│   ├── fate-arena.ts       #   竞技大厅房间构建
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

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

然后访问 `http://localhost:3000`。

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
const text = await proxy.generateText("用三句话介绍主角人生模拟器");

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
  -d '{"mode":"generate","prompt":"用三句话介绍主角人生模拟器"}'

# 多轮对话
curl -X POST http://localhost:3000/api/llm/test \
  -H "Content-Type: application/json" \
  -d '{"mode":"chat","systemPrompt":"你是恋爱排练顾问","messages":[{"role":"user","content":"给我写一句自然的相亲开场白"}]}'
```

## API 端点

### 主角与绑定

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/bind/ailiangbiao/complete` | AI 量表绑定完成回调 |
| POST | `/api/personas/import` | 导入/铸造主角快照 |

### 竞技场

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/matches` | 创建对局 |
| POST | `/api/matches/:matchId/support` | 支持角色（消耗 Renown） |
| POST | `/api/matches/:matchId/rounds/:round/trigger` | 触发回合推进 |
| GET | `/api/streams/:streamId` | 获取章节流 |

### 相亲排练

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/dating/dossiers` | 提炼相亲档案 |
| POST | `/api/dating/rehearsals` | 执行排练 |

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

## 核心设计

### 规则引擎 vs AI

| 职责 | 执行者 | 说明 |
|------|--------|------|
| 资格判断、分数、淘汰、奖励结算、记忆碎片生成 | 规则引擎 | 公平性关键，不依赖 AI |
| 世界包摘要重写、相亲排练文案、章节润色 | Gemini | 仅叙事增强，在结果固定后执行 |

### 经济系统

- **Renown（声望）** — 唯一可公开支持角色的货币
- **Diamonds（钻石）** — 在钱包模型中可见，但不参与公开支持

### 数据与隐私

- 上传的简历和世界素材缓存在 `data/app-db.json`，TTL 自动清理
- 主角删除会幽灵化公开记录，并从本地演示数据中移除 PII
- 主角快照（PersonaSnapshot）创建后锁定不可变，外层画像（PersonaOverlay）可编辑

## 脚本命令

```bash
npm run dev        # 启动开发服务器
npm run build      # 生产构建
npm run start      # 启动生产服务器
npm run typecheck  # 类型检查
```
