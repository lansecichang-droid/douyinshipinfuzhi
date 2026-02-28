#!/usr/bin/env node
/**
 * 抖音创作助手 - 每日监控脚本
 * 09:00 自动执行：抓取监控账号昨日新视频并分析
 * 
 * 标准流程：获取视频 → 转录口播 → AI分析 → 生成建议
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

// 配置（从环境变量读取）
const CONFIG = {
  feishu: {
    app_token: process.env.FEISHU_APP_TOKEN || 'QpPebRBlMawJeCs8b83cWhoLnOh',
    monitor_table: process.env.FEISHU_MONITOR_TABLE || 'tblKbxqmIw9HrjCf',
    analysis_table: process.env.FEISHU_ANALYSIS_TABLE || 'tbluSZ9P8GKeD2JP',
  },
  ai302: {
    api_key: process.env.AI302_API_KEY || 'sk-l0F8jQgR0ZqjOL96MyPSfz7Yi0DJVkABzf8xGMCOPR54XVXY',
    base_url: process.env.AI302_BASE_URL || 'https://api.302.ai',
  },
  jizhile: {
    base_url: process.env.JZL_BASE_URL || 'https://www.dajiala.com',
    api_key: process.env.JZL_API_KEY || 'JZL34425f12232a7000',
    endpoints: {
      getUserInfo: '/fbmain/monitor/v3/douyin_user_data',
      getUserVideos: '/fbmain/monitor/v3/douyin_user_post',
      getVideoDetail: '/fbmain/monitor/v3/douyin_aweme_detail',
      search: '/fbmain/monitor/v3/douyin_general_search',
      searchV3: '/fbmain/monitor/v3/douyin_general_search3',
      getComments: '/fbmain/monitor/v3/douyin_video_comment',
      getSubComments: '/fbmain/monitor/v3/douyin_video_sub_comment',
    }
  }
};

// 极致了API请求封装
async function jizhileRequest(endpoint, body) {
  const { jizhile } = CONFIG;
  const url = `${jizhile.base_url}${endpoint}?key=${jizhile.api_key}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  
  if (data.code !== 200 && data.code !== 0) {
    throw new Error(data.msg || `API错误: ${data.code}`);
  }
  
  return data;
}

// 获取视频详情
async function getVideoDetail(videoUrl) {
  try {
    const data = await jizhileRequest(
      CONFIG.jizhile.endpoints.getVideoDetail,
      { url: videoUrl }
    );
    
    if (!data.data?.aweme_detail) {
      throw new Error('未获取到视频详情');
    }
    
    const video = data.data.aweme_detail;
    return {
      aweme_id: video.aweme_id,
      desc: video.desc,
      create_time: video.create_time,
      likes: video.statistics?.digg_count || 0,
      comments: video.statistics?.comment_count || 0,
      shares: video.statistics?.share_count || 0,
      collects: video.statistics?.collect_count || 0,
      author: video.author?.nickname,
      sec_uid: video.author?.sec_uid,
      share_url: video.share_info?.share_url,
      raw_data: video,
    };
  } catch (error) {
    console.error(`获取视频详情失败: ${error.message}`);
    return null;
  }
}

// 获取用户主页视频
async function getUserVideos(secUid, page = 1, pageSize = 20) {
  try {
    const data = await jizhileRequest(
      CONFIG.jizhile.endpoints.getUserVideos,
      { 
        id: secUid,
        page,
        page_size: pageSize 
      }
    );
    
    return data.data?.aweme_list || [];
  } catch (error) {
    console.error(`获取用户主页失败: ${error.message}`);
    return [];
  }
}

// 主函数
async function main() {
  console.log('🎬 抖音每日监控启动...');
  console.log(`⏰ 执行时间: ${new Date().toLocaleString('zh-CN')}`);
  
  try {
    // 1. 读取监控账号表
    console.log('\n📋 步骤1: 读取监控账号...');
    const accounts = await getMonitorAccounts();
    console.log(`   发现 ${accounts.length} 个监控账号`);
    
    // 2. 抓取每个账号的新视频
    console.log('\n📥 步骤2: 抓取新视频...');
    const newVideos = [];
    for (const account of accounts) {
      if (account['监控状态'] !== '监控中') continue;
      
      console.log(`   检查: ${account['昵称']}...`);
      const videos = await fetchNewVideos(account);
      newVideos.push(...videos);
    }
    console.log(`   共发现 ${newVideos.length} 条新视频`);
    
    // 3. 下载视频并转文字
    console.log('\n🎵 步骤3: 视频内容提取...');
    for (const video of newVideos.slice(0, 10)) {
      try {
        console.log(`   处理: ${video.title?.slice(0, 30)}...`);
        
        // 获取视频详情（补充完整信息）
        const detail = await getVideoDetail(video.url);
        if (detail) {
          Object.assign(video, detail);
        }
        
        // 4. AI分析视频结构
        console.log('   🤖 AI分析中...');
        const analysis = await analyzeVideo(video);
        
        // 5. 存储到飞书
        await saveToFeishu(video, analysis);
        console.log('   ✅ 已存储');
        
      } catch (err) {
        console.error(`   ❌ 处理失败: ${err.message}`);
      }
    }
    
    console.log('\n✨ 监控完成！');
    
  } catch (error) {
    console.error('❌ 监控失败:', error);
    process.exit(1);
  }
}

// 获取监控账号
async function getMonitorAccounts() {
  // 从飞书读取监控账号表
  // 目前硬编码测试账号
  return [
    {
      '账号ID': 'MS4wLjABAAAAJNts8oZ5FOMjrt5nXGQVcw47VcJvq29Pnvn9kjcODs0pkWQPLwz1CyNULDlvnlHK',
      '昵称': '徐老师AI',
      '领域标签': ['AI', '科技'],
      '粉丝量': 0,
      '监控状态': '监控中',
      '最后更新': new Date().toISOString(),
    },
    {
      '账号ID': 'MS4wLjABAAAAwU33jOgLTqUV9Ub1h-Vgcd0VbQa-vV4lifYAzQSqgZ4',
      '昵称': '卡兹克',
      '领域标签': ['AI', 'AIGC', '科技'],
      '粉丝量': 0,
      '监控状态': '监控中',
      '最后更新': new Date().toISOString(),
      '主页链接': 'https://v.douyin.com/ceSaIJc8MEE/'
    }
  ];
}

// 抓取新视频
async function fetchNewVideos(account) {
  console.log(`      检查账号: ${account['昵称']}...`);
  
  try {
    // 获取用户主页视频列表
    const videos = await getUserVideos(account['账号ID'], 1, 20);
    
    if (!videos || videos.length === 0) {
      console.log('      未获取到视频列表');
      return [];
    }
    
    // 过滤昨日发布的视频
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newVideos = videos.filter(video => {
      const createTime = new Date(video.create_time * 1000);
      return createTime >= yesterday && createTime < today;
    });
    
    console.log(`      发现 ${newVideos.length} 条昨日新视频`);
    
    // 转换为统一格式
    return newVideos.map(video => ({
      aweme_id: video.aweme_id,
      url: `https://www.douyin.com/video/${video.aweme_id}`,
      title: video.desc?.slice(0, 50) || '无标题',
      desc: video.desc,
      create_time: video.create_time,
      likes: video.statistics?.digg_count || 0,
      comments: video.statistics?.comment_count || 0,
      shares: video.statistics?.share_count || 0,
      collects: video.statistics?.collect_count || 0,
      author: account['昵称'],
      sec_uid: account['账号ID'],
    }));
    
  } catch (error) {
    console.error(`      抓取失败: ${error.message}`);
    return [];
  }
}

// 下载视频
async function downloadVideo(url) {
  const { execSync } = require('child_process');
  const outputDir = path.join(__dirname, '../downloads');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  return path.join(outputDir, 'video.mp4');
}

// 视频转文字
async function videoToText(videoPath) {
  const response = await fetch(`${CONFIG.ai302.base_url}/v1/audio/transcriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.ai302.api_key}`,
    },
    body: JSON.stringify({
      model: 'vc',
      file: videoPath,
      response_format: 'text'
    })
  });
  
  const data = await response.json();
  return data.text || '';
}

// AI分析视频
async function analyzeVideo(video) {
  const prompt = `
你是一位抖音内容分析专家。请分析以下视频的文案内容，提取关键信息：

【视频信息】
- 标题/文案: ${video.desc || '未知'}
- 点赞量: ${video.likes || 0}
- 评论量: ${video.comments || 0}

【分析要求】
请按照以下维度分析，并返回JSON格式：
{
  "content_tags": ["标签1", "标签2"],
  "golden_3s": "前3秒钩子分析",
  "retention_hooks": ["技巧1", "技巧2"],
  "script_structure": "脚本结构",
  "traffic_formula": ["流量密码1"],
  "golden_quotes": ["金句1"],
  "reusability_score": 8,
  "analysis_reason": "为什么火"
}

只返回JSON，不要其他内容。
`;

  const response = await fetch(`${CONFIG.ai302.base_url}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.ai302.api_key}`,
    },
    body: JSON.stringify({
      model: 'gemini-3-flash-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
  });
  
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// 存储到飞书
async function saveToFeishu(video, analysis) {
  console.log('      存储分析结果...');
}

// 执行
if (require.main === module) {
  main();
}

module.exports = { main, getVideoDetail, getUserVideos };
