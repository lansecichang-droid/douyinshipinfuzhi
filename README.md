# 🎬 抖音内容创作助手/全平台视频复刻 Skill

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Skill-blue.svg)](https://openclaw.ai)

抖音视频创作全流程自动化助手，基于对标账号监控、爆款视频拆解、AI智能创作，实现从选题到成片的完整工作流。

## ✨ 功能特性

- 📊 **达人监控** - 自动追踪对标账号，抓取最新视频数据
- 🔍 **爆款拆解** - AI分析视频结构、黄金3秒、流量密码
- 💡 **智能选题** - 基于数据分析生成创作选题
- ✍️ **脚本创作** - Gemini 3 Flash 自动生成视频脚本
- 🎨 **素材生成** - 即梦3.0 Pro / 豆包Seedream 5.0 生成图片/视频
- 📦 **产品定制** - 针对产品特点定制种草内容

## 🚀 快速开始

### 1. 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/douyin-creator-skill.git
cd douyin-creator-skill

# 安装依赖
npm install

# 复制环境配置
cp .env.example .env
```

### 2. 配置

编辑 `.env` 文件，填入你的API密钥：

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

### 3. 使用

```bash
# 运行每日监控
node scripts/daily-monitor-v2.js

# 生成选题推荐
node scripts/topic-generator.js

# 创作脚本
node scripts/create-script.js --topic "选题内容" --product "产品名称"

# 分析视频
node scripts/gemini-video-analysis.js --video "视频路径"
```

## 📋 系统架构

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
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔗 依赖服务

| 服务 | 用途 | 获取地址 |
|------|------|----------|
| **极致了API** | 抖音数据采集 | https://www.dajiala.com |
| **302 AI** | 文本/图片/视频生成 | https://302.ai |
| **飞书** | 数据存储 | https://feishu.cn |
| **Istero** | 视频下载解析 | https://api.istero.com |

## 📚 文档

详细使用文档请查看 [SKILL.md](./SKILL.md)

## 🛠️ 技术栈

- **Runtime**: Node.js 18+
- **AI模型**: Gemini 3 Flash / Gemini 3.1 Flash Image
- **图片生成**: 豆包 Seedream 5.0
- **视频生成**: 即梦 3.0 Pro
- **数据存储**: 飞书多维表格

## 📄 许可证

[MIT](./LICENSE)

## 👤 作者

**AwriteAi** - 营销智能平台

---

> 🌀 适用于 [OpenClaw](https://openclaw.ai) 智能助手平台
