# 抖音内容创作助手 Skill

抖音视频创作全流程自动化助手。基于对标账号监控、爆款视频拆解、AI智能创作，实现从选题到成片的完整工作流。

## 能力

- 抖音达人账号监控与视频抓取
- 爆款视频结构拆解与分析
- 智能选题推荐
- AI脚本创作（Gemini 3 Flash）
- 视频/图片素材生成（即梦3.0 Pro / 豆包Seedream 5.0）
- 产品种草内容定制

## 安装

无需安装，直接调用。

## 配置

1. 复制 `.env.example` 为 `.env`：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入你的API密钥：
```bash
# 极致了API - 抖音数据采集
JZL_API_KEY=your_jizhile_api_key_here

# 302 AI - 文本/图片/视频生成
AI302_API_KEY=your_302ai_api_key_here

# 飞书 - 数据存储
FEISHU_APP_TOKEN=your_feishu_app_token_here

# Istero - 视频下载解析
ISTERO_TOKEN=your_istero_token_here
```

## 获取API密钥

### 极致了API (抖音数据采集)
- 官网: https://www.dajiala.com
- 用于获取抖音视频详情、用户信息、评论等数据

### 302 AI (AI生成)
- 官网: https://302.ai
- 用于文本生成(Gemini)、图片生成(Seedream)、视频生成(即梦)

### 飞书 (数据存储)
- 创建多维表格，获取 App Token
- 用于存储监控账号、视频拆解、选题库等数据

### Istero (视频下载)
- 官网: https://api.istero.com
- 用于无水印下载抖音/小红书/快手/B站视频

## 极致了API 接口

**Base URL**: `https://www.dajiala.com`

### 接口端点

| 功能 | 端点 |
|------|------|
| 获取视频详情 | `POST /fbmain/monitor/v3/douyin_aweme_detail` |
| 获取用户主页 | `POST /fbmain/monitor/v3/douyin_user_post` |
| 获取用户信息 | `POST /fbmain/monitor/v3/douyin_user_data` |
| 综合搜索 | `POST /fbmain/monitor/v3/douyin_general_search3` |
| 视频评论 | `POST /fbmain/monitor/v3/douyin_video_comment` |

### 返回数据结构

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "aweme_detail": {
      "aweme_id": "视频ID",
      "desc": "视频文案",
      "create_time": 1755563409,
      "statistics": {
        "digg_count": 8376,
        "comment_count": 500,
        "share_count": 1865,
        "collect_count": 1475
      },
      "author": {
        "sec_uid": "用户sec_uid",
        "nickname": "用户名"
      }
    }
  }
}
```

## 使用

### 1. 每日监控流程（09:00自动执行）

```bash
# 手动触发监控
node scripts/daily-monitor-v2.js

# 系统执行：
# 1. 读取监控账号表
# 2. 抓取昨日新发布视频
# 3. 下载视频并转文字
# 4. AI分析视频结构
# 5. 存储到飞书拆解表
```

### 2. 获取选题推荐

```bash
node scripts/topic-generator.js
```

### 3. 创作脚本

```bash
node scripts/create-script.js --topic "选题内容" --product "产品名称"
```

### 4. 视频分析

```bash
node scripts/gemini-video-analysis.js --video "视频路径"
```

## 工作流程

```
┌─────────────────────────────────────────────────────────────┐
│                      抖音创作作战系统                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  监控层      │───▶│  分析层      │───▶│  创作层      │  │
│  │              │    │              │    │              │  │
│  │ • 达人追踪   │    │ • 视频拆解   │    │ • 选题生成   │  │
│  │ • 视频抓取   │    │ • 标签提取   │    │ • 脚本创作   │  │
│  │ • 数据存储   │    │ • 爆款分析   │    │ • 素材生成   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  飞书多维表格                        │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │  │
│  │  │ 监控账号表  │ │ 视频拆解表  │ │ 选题库      │   │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 数据表结构

### 监控账号表

| 字段 | 类型 | 说明 |
|------|------|------|
| 账号ID | 文本 | 抖音sec_uid |
| 昵称 | 文本 | 达人昵称 |
| 领域标签 | 多选 | AI/商业/科技等 |
| 粉丝量 | 数字 | 当前粉丝数 |
| 监控状态 | 单选 | 监控中/暂停 |
| 最后更新 | 日期 | 上次抓取时间 |
| 优先级 | 单选 | P0/P1/P2 |

### 视频拆解表

| 字段 | 类型 | 说明 |
|------|------|------|
| 视频链接 | URL | 原始链接 |
| 达人昵称 | 文本 | 关联账号 |
| 文案内容 | 文本 | 视频转文字 |
| 点赞量 | 数字 | 点赞数 |
| 评论量 | 数字 | 评论数 |
| 转发量 | 数字 | 转发数 |
| 内容标签 | 多选 | AI/商业思维等 |
| 黄金3秒 | 文本 | 开头话术分析 |
| 完播率优化 | 文本 | 留住用户的技巧 |
| 脚本结构 | 文本 | 分段结构描述 |
| 流量密码 | 多选 | 焦虑/好奇/共鸣等 |
| 金句摘录 | 文本 | 可复用的金句 |
| 可复用度 | 评分 | 1-10分 |

### 选题库表

| 字段 | 类型 | 说明 |
|------|------|------|
| 选题方向 | 文本 | 标题/主题 |
| 参考视频 | 关联 | 拆解表中的视频 |
| 创作角度 | 文本 | 切入点建议 |
| 产品关联度 | 评分 | 1-10分 |
| 预估热度 | 评分 | 1-10分 |
| 状态 | 单选 | 待创作/创作中/已发布 |
| 优先级 | 单选 | P0/P1/P2 |

## API集成

### 302 AI API

**文档**: https://302.ai

**模型映射**:
| 功能 | 模型ID | 端点 |
|------|--------|------|
| 视频转文字 | vc | `/v1/audio/transcriptions` |
| 文字生成 | gemini-3-flash-preview | `/v1/chat/completions` |
| 视频生成 | jimeng-video-3-pro | `/v1/videos/generations` |
| 图片生成 | doubao-seedream-5-0-260128 | `/v1/images/generations` |

### Istero 视频解析API

**文档**: https://api.istero.com/service/doc/video-parser-v2

**解析视频**:
```bash
curl -X POST "https://api.istero.com/resource/v2/video/analysis" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "url=视频链接"
```

**返回示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "title": "视频标题",
    "cover": "封面图URL",
    "url": "无水印下载地址",
    "platformName": "抖音"
  }
}
```

## 创作流程示例

### 示例1: 被动监控发现爆款

1. 09:00 系统抓取到某AI博主新视频，点赞10w+
2. AI分析：黄金3秒是「ChatGPT被淘汰了？」，引发焦虑
3. 结构拆解：悬念开头 → 产品展示 → 对比演示 → 行动号召
4. 11:00 推送选题：「国产AI工具替代方案」

### 示例2: 主动创作种草视频

```bash
node scripts/create-script.js --product "AwriteAi" --style 种草 --duration 30s
```

输出：
```
📱 抖音脚本：《1分钟生成10条爆款文案，这个AI工具杀疯了》

【黄金3秒】
画面：手指疯狂打字又删除
文案：「写文案写到头秃？我用这个AI 1分钟搞定10条」

【痛点共鸣】
画面：凌晨2点还在改稿
文案：「以前写一条要2小时，现在...」

【产品展示】
画面：AwriteAi界面录屏
文案：「输入关键词，自动出10个角度，还能选风格」

【效果对比】
画面：Before/After对比
文案：「传统写法 vs AI写法，点击率高了3倍」

【行动号召】
画面：二维码+产品界面
文案：「评论区扣1，领7天免费试用」
```

## 作者

AwriteAi - 营销智能平台
