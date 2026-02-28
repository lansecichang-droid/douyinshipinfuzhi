#!/usr/bin/env node
/**
 * 获取监控账号昨日视频
 */

const API_KEY = 'JZL34425f12232a7000';
const BASE_URL = 'https://www.dajiala.com';

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
  }
];

// 获取昨天日期范围
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
    dateStr: yesterday.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', year: 'numeric' })
  };
}

// API请求
async function jizhileRequest(endpoint, body) {
  const url = `${BASE_URL}${endpoint}?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  const data = await response.json();
  return data;
}

// 获取用户主页视频
async function getUserVideos(sec_uid, page = 1) {
  try {
    const data = await jizhileRequest('/fbmain/monitor/v3/douyin_user_post', {
      sec_uid: sec_uid,
      page: page,
      page_size: 20
    });
    
    if (data.code !== 200 && data.code !== 0) {
      console.log(`   API返回错误: ${data.msg || data.message}`);
      return null;
    }
    
    return data.data?.aweme_list || [];
  } catch (error) {
    console.log(`   请求失败: ${error.message}`);
    return null;
  }
}

// 主函数
async function main() {
  const yesterday = getYesterdayRange();
  
  console.log('═══════════════════════════════════════════════════');
  console.log(`📊 抖音监控账号昨日内容报告`);
  console.log(`📅 ${yesterday.dateStr}`);
  console.log('═══════════════════════════════════════════════════\n');
  
  let totalVideos = 0;
  
  for (const account of MONITOR_ACCOUNTS) {
    console.log(`📱 ${account.nickname}`);
    console.log(`   标签: ${account.tags.join('/')}`);
    
    const videos = await getUserVideos(account.sec_uid);
    
    if (!videos || videos.length === 0) {
      console.log('   ⚠️ 未获取到视频数据\n');
      continue;
    }
    
    // 筛选昨天发布的视频
    const yesterdayVideos = videos.filter(v => {
      const createTime = v.create_time;
      return createTime >= yesterday.start && createTime < yesterday.end;
    });
    
    if (yesterdayVideos.length === 0) {
      console.log('   📭 昨日无新发布\n');
      continue;
    }
    
    console.log(`   🆕 昨日发布: ${yesterdayVideos.length} 条\n`);
    
    yesterdayVideos.forEach((video, idx) => {
      const date = new Date(video.create_time * 1000);
      const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const stats = video.statistics || {};
      
      console.log(`   ${idx + 1}. ${video.desc?.slice(0, 40) || '无标题'}...`);
      console.log(`      ⏰ ${timeStr} | ❤️ ${stats.digg_count || 0} | 💬 ${stats.comment_count || 0} | 🔄 ${stats.share_count || 0}`);
      console.log(`      🔗 https://www.douyin.com/video/${video.aweme_id}\n`);
      
      totalVideos++;
    });
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log(`📈 总计: ${totalVideos} 条视频`);
  console.log('═══════════════════════════════════════════════════');
}

main().catch(console.error);
