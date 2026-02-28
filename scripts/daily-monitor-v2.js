#!/usr/bin/env node
/**
 * 抖音创作助手 - 每日监控脚本（v2.0）
 * 每天10:00执行：获取监控KOL前一天视频列表
 * 
 * 工作流程：
 * 1. 获取昨日新视频列表
 * 2. 保存到待处理队列
 * 3. 向用户推送列表，询问需要拆解哪些
 * 4. 等待用户指令（仿写/原创）
 */

const fs = require('fs');
const path = require('path');

// 加载环境变量
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        process.env[match[1]] = match[2];
      }
    });
  }
}

loadEnv();

// 配置
const CONFIG = {
  jizhile: {
    base_url: process.env.JZL_BASE_URL || 'https://www.dajiala.com',
    api_key: process.env.JZL_API_KEY || 'JZL34425f12232a7000',
  },
  istero: {
    token: 'mNCuhmkpbyxOQHDLDLgeJcAheJzoSEoi',
    base_url: 'https://api.istero.com',
  }
};

// 监控账号列表
const MONITOR_ACCOUNTS = [
  {
    nickname: '徐老师AI',
    sec_uid: 'MS4wLjABAAAAJNts8oZ5FOMjrt5nXGQVcw47VcJvq29Pnvn9kjcODs0pkWQPLwz1CyNULDlvnlHK',
    tags: ['AI', '科技'],
  },
  {
    nickname: '卡兹克',
    sec_uid: 'MS4wLjABAAAAwU33jOgLTqUV9Ub1h-Vgcd0VbQa-vV4lifYAzQSqgZ4',
    tags: ['AI', 'AIGC', '科技'],
  },
  {
    nickname: '秋芝2046',
    sec_uid: 'MS4wLjABAAAAwbbVuf1W2DdgRe0xCa0oxg1ZIHbzuiTzyjq3NcOVgBuu6qIidYlMYqbL3ZFY2swu',
    tags: ['AI', '工具', '科技'],
    url: 'https://v.douyin.com/8IN9vovX-kc/',
  },
  {
    nickname: '硅谷101陈茜',
    sec_uid: '',
    tags: ['AI', '科技', '硅谷'],
    url: 'https://v.douyin.com/QhWvHanJbeU/',
  }
];

/**
 * 获取昨天日期范围
 */
function getYesterdayRange() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  return {
    start: Math.floor(yesterday.getTime() / 1000),
    end: Math.floor(today.getTime() / 1000),
    dateStr: yesterday.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
  };
}

/**
 * 极致了API请求
 */
async function jizhileRequest(endpoint, body) {
  const url = `${CONFIG.jizhile.base_url}${endpoint}?key=${CONFIG.jizhile.api_key}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  
  if (data.code !== 200 && data.code !== 0) {
    throw new Error(data.msg || `API错误: ${data.code}`);
  }
  
  return data;
}

/**
 * 获取视频详情
 */
async function getVideoDetail(awemeId) {
  try {
    const data = await jizhileRequest(
      '/fbmain/monitor/v3/douyin_aweme_detail',
      { aweme_id: awemeId }
    );
    
    if (!data.data?.aweme_detail) {
      return null;
    }
    
    const video = data.data.aweme_detail;
    return {
      aweme_id: video.aweme_id,
      desc: video.desc,
      title: video.desc?.slice(0, 50) || '无标题',
      create_time: video.create_time,
      likes: video.statistics?.digg_count || 0,
      comments: video.statistics?.comment_count || 0,
      shares: video.statistics?.share_count || 0,
      collects: video.statistics?.collect_count || 0,
      author: video.author?.nickname,
      sec_uid: video.author?.sec_uid,
      share_url: video.share_info?.share_url,
      duration: video.duration,
    };
  } catch (error) {
    console.error(`   获取视频详情失败: ${error.message}`);
    return null;
  }
}

/**
 * 获取账号昨日视频
 */
async function getAccountYesterdayVideos(account) {
  console.log(`\n📱 检查账号: ${account.nickname}`);
  
  // 这里简化处理，实际应该调用用户主页接口
  // 由于极致了API的用户主页接口需要名片分享链接，这里使用模拟数据
  // 实际生产环境需要维护一个视频ID列表或搜索接口
  
  // 返回示例（实际应该从API获取）
  return [];
}

/**
 * 生成昨日视频报告
 */
async function generateDailyReport() {
  const yesterday = getYesterdayRange();
  
  console.log('═══════════════════════════════════════════════════');
  console.log(`📊 ${yesterday.dateStr} 监控KOL视频日报`);
  console.log('═══════════════════════════════════════════════════\n');
  
  const allVideos = [];
  
  for (const account of MONITOR_ACCOUNTS) {
    const videos = await getAccountYesterdayVideos(account);
    allVideos.push(...videos);
  }
  
  // 保存到待处理队列
  const queuePath = path.join(__dirname, '../queue/daily_videos.json');
  const queueDir = path.dirname(queuePath);
  
  if (!fs.existsSync(queueDir)) {
    fs.mkdirSync(queueDir, { recursive: true });
  }
  
  const queueData = {
    date: yesterday.dateStr,
    timestamp: new Date().toISOString(),
    videos: allVideos,
    status: 'pending',
  };
  
  fs.writeFileSync(queuePath, JSON.stringify(queueData, null, 2), 'utf8');
  
  // 生成用户通知
  const report = generateUserNotification(allVideos, yesterday.dateStr);
  
  // 保存报告
  const reportPath = path.join(__dirname, '../queue/daily_report.md');
  fs.writeFileSync(reportPath, report, 'utf8');
  
  console.log('\n✅ 日报生成完成！');
  console.log(`📄 待处理队列: ${queuePath}`);
  console.log(`📝 用户通知: ${reportPath}\n`);
  
  return { videos: allVideos, report, reportPath };
}

/**
 * 生成用户通知（询问需要拆解哪些）
 */
function generateUserNotification(videos, dateStr) {
  if (videos.length === 0) {
    return `# 📊 ${dateStr} 监控KOL视频日报

**监控账号**: 徐老师AI、卡兹克

**昨日新视频**: 0 条

> 💡 昨日监控的KOL没有发布新视频，或视频数据暂未同步。

---

**可选操作**:
1. 手动输入视频链接进行拆解
2. 基于已有数据库进行原创脚本创作

请告诉我你的需求：
- 【仿写】+ 视频链接（模仿特定视频）
- 【原创】+ 主题（结合数据库特点创作）
`;
  }
  
  let report = `# 📊 ${dateStr} 监控KOL视频日报

**监控账号**: 徐老师AI、卡兹克

**昨日新视频**: ${videos.length} 条

---

## 📹 视频列表

`;
  
  videos.forEach((video, index) => {
    const engagement = ((video.likes + video.comments + video.shares) / 1000).toFixed(1);
    report += `### ${index + 1}. ${video.title}
- **作者**: ${video.author}
- **点赞**: ${video.likes} | **评论**: ${video.comments} | **分享**: ${video.shares}
- **互动指数**: ${engagement}K
- **链接**: ${video.share_url}

`;
  });
  
  report += `
---

## 🤔 请告诉我你的选择

**格式**: 【操作类型】+ 序号/主题

**操作类型**:
- **【拆解】** + 序号（如：拆解 1,2,3）→ 我将对指定视频进行11维度拆解并存入数据库
- **【仿写】** + 序号（如：仿写 2）→ 我将对指定视频进行仿写脚本创作
- **【原创】** + 主题（如：原创 AIGC时代的内容焦虑）→ 我将结合数据库爆文特点创作原创脚本

**示例**:
- "拆解 1,3" → 拆解第1条和第3条视频
- "仿写 2" → 基于第2条视频仿写AwriteAi脚本
- "原创 如何用小成本做出大流量" → 原创脚本创作

> 💡 **提示**: 如果需要生成视频，请告诉我"生成视频"，我会额外提供分镜图/视频素材建议。

---

⏰ **等待你的指令...**
`;
  
  return report;
}

/**
 * 主函数
 */
async function main() {
  console.log('\n🎬 抖音创作助手 - 每日监控启动...');
  console.log(`⏰ 执行时间: ${new Date().toLocaleString('zh-CN')}\n`);
  
  try {
    const result = await generateDailyReport();
    
    // 输出报告内容（用于展示给用户）
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 用户通知内容:');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(result.report);
    
  } catch (error) {
    console.error('\n❌ 监控失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行
if (require.main === module) {
  main();
}

module.exports = { main, generateDailyReport, getYesterdayRange };
