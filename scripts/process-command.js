#!/usr/bin/env node
/**
 * 用户指令处理脚本
 * 处理：拆解、仿写、原创 三种指令
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  ai302: {
    api_key: 'sk-l0F8jQgR0ZqjOL96MyPSfz7Yi0DJVkABzf8xGMCOPR54XVXY',
    base_url: 'https://api.302.ai',
  },
  istero: {
    token: 'mNCuhmkpbyxOQHDLDLgeJcAheJzoSEoi',
    base_url: 'https://api.istero.com',
  }
};

// AwriteAi产品信息
const AWRITEAI_INFO = {
  name: 'AwriteAi',
  features: '一键生成多平台文案、爆款标题、智能选题、数据分析',
  target: '内容创作者、营销人员、中小企业主',
  sellingPoint: '节省80%文案时间，提升3倍点击转化率',
  pricing: '免费试用7天，月付99元起',
  cta: '评论区扣1领7天免费试用',
};

/**
 * 解析用户指令
 */
function parseCommand(input) {
  // 拆解 1,2,3
  const拆解Match = input.match(/拆解\s*([\d,\s]+)/i);
  if (拆解Match) {
    const indices = 拆解Match[1].split(/[,\s]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    return { type: '拆解', indices };
  }
  
  // 仿写 2
  const 仿写Match = input.match(/仿写\s*(\d+)/i);
  if (仿写Match) {
    return { type: '仿写', index: parseInt(仿写Match[1]) };
  }
  
  // 原创 xxx
  const 原创Match = input.match(/原创\s*(.+)/i);
  if (原创Match) {
    return { type: '原创', topic: 原创Match[1].trim() };
  }
  
  return null;
}

/**
 * 从队列加载视频列表
 */
function loadQueue() {
  const queuePath = path.join(__dirname, '../queue/daily_videos.json');
  
  if (!fs.existsSync(queuePath)) {
    return null;
  }
  
  return JSON.parse(fs.readFileSync(queuePath, 'utf8'));
}

/**
 * 执行拆解操作
 */
async function execute拆解(indices, videos) {
  console.log(`\n🔍 执行拆解操作: 视频 ${indices.join(', ')}\n`);
  
  const results = [];
  
  for (const index of indices) {
    const video = videos[index - 1];
    if (!video) {
      console.log(`⚠️ 视频 ${index} 不存在，跳过`);
      continue;
    }
    
    console.log(`\n📹 拆解视频 ${index}: ${video.title.slice(0, 40)}...`);
    
    // 这里应该调用完整的11维度拆解流程
    // 简化版：直接使用Gemini分析
    const analysis = await analyzeVideoWithGemini(video);
    
    // 保存到数据库
    saveToDatabase(video, analysis);
    
    results.push({ index, video, analysis });
    
    console.log(`   ✅ 拆解完成并已存入数据库`);
  }
  
  return results;
}

/**
 * 执行仿写操作
 */
async function execute仿写(index, videos) {
  console.log(`\n✍️ 执行仿写操作: 视频 ${index}\n`);
  
  const video = videos[index - 1];
  if (!video) {
    console.log(`❌ 视频 ${index} 不存在`);
    return null;
  }
  
  console.log(`📹 参考视频: ${video.title.slice(0, 40)}...`);
  
  // 1. 先拆解视频
  console.log('\n第一步：深度拆解视频...');
  const analysis = await analyzeVideoWithGemini(video);
  
  // 2. 基于拆解生成仿写脚本
  console.log('\n第二步：生成AwriteAi仿写脚本...');
  const script = await generate仿写Script(analysis, video, AWRITEAI_INFO);
  
  // 保存脚本
  const scriptPath = saveScript(script, video, '仿写');
  
  console.log(`\n✅ 仿写完成！`);
  console.log(`💾 脚本保存: ${scriptPath}`);
  
  return { video, analysis, script, scriptPath };
}

/**
 * 执行原创操作
 */
async function execute原创(topic) {
  console.log(`\n🎨 执行原创操作: 主题「${topic}」\n`);
  
  // 1. 从数据库加载已有的爆款拆解
  const db = loadDatabase();
  
  console.log(`📊 加载数据库: ${db.length} 条爆款拆解`);
  
  // 2. 基于数据库特点创作
  console.log('\n基于数据库爆款特点进行创作...');
  const script = await generate原创Script(topic, db, AWRITEAI_INFO);
  
  // 保存脚本
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `原创_${topic.replace(/\s+/g, '_')}_${timestamp}.md`;
  const scriptPath = path.join(__dirname, '../generated_scripts', filename);
  
  fs.writeFileSync(scriptPath, script, 'utf8');
  
  console.log(`\n✅ 原创完成！`);
  console.log(`💾 脚本保存: ${scriptPath}`);
  
  return { topic, script, scriptPath };
}

/**
 * 使用Gemini分析视频
 */
async function analyzeVideoWithGemini(video) {
  const prompt = `
请对以下抖音视频进行11维度深度拆解：

【视频信息】
- 标题: ${video.title}
- 作者: ${video.author}
- 点赞: ${video.likes} | 评论: ${video.comments} | 分享: ${video.shares} | 收藏: ${video.collects}

【11维度拆解要求】
1. 核心主题（10字以内）
2. 一句话总结
3. 爆款理由（2-3点）
4. 标题套路（2-5个标签）
5. 写作风格（2-5个标签）
6. 流量密码（2-5个标签）
7. 金句摘录（3-5句）
8. 开头手法（前15秒技巧）
9. 结构脉络（按时间段）
10. 核心观点（1-2个）
11. 目标受众（人群及痛点）

请详细输出，这将存入创作数据库。
`;

  const response = await fetch(`${CONFIG.ai302.base_url}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.ai302.api_key}`,
    },
    body: JSON.stringify({
      model: 'gemini-3-flash-preview',
      messages: [
        { role: 'system', content: '你是一位专业的抖音视频拆解分析师。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    }),
  });
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * 生成仿写脚本
 */
async function generate仿写Script(analysis, video, product) {
  const prompt = `
基于以下视频拆解，为【${product.name}】创作仿写脚本。

【参考视频拆解】
${analysis}

【产品信息】
- 名称: ${product.name}
- 功能: ${product.features}
- 目标用户: ${product.target}
- 核心卖点: ${product.sellingPoint}
- 定价: ${product.pricing}

【要求】
1. 严格遵循参考视频的结构和情绪曲线
2. 使用类似的标题套路和金句风格
3. 自然融入产品信息
4. 包含分镜表格
5. 总时长3-4分钟

请输出完整的视频脚本。
`;

  const response = await fetch(`${CONFIG.ai302.base_url}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.ai302.api_key}`,
    },
    body: JSON.stringify({
      model: 'gemini-3-flash-preview',
      messages: [
        { role: 'system', content: '你是一位资深的短视频脚本策划师。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * 生成原创脚本
 */
async function generate原创Script(topic, db, product) {
  // 提取数据库中的爆款特点
  const patterns = db.map(item => {
    const analysis = item.analysis || {};
    return {
      titlePattern: analysis['4_标题套路'] || [],
      writingStyle: analysis['5_写作风格'] || [],
      trafficKeys: analysis['6_流量密码'] || [],
      opening: analysis['8_开头手法'] || {},
      structure: analysis['9_结构脉络'] || [],
    };
  });
  
  const prompt = `
请基于以下爆款数据库特点，创作一个关于「${topic}」的原创视频脚本。

【数据库爆款特点】
${JSON.stringify(patterns.slice(0, 3), null, 2)}

【产品信息】
- 名称: ${product.name}
- 功能: ${product.features}
- 目标用户: ${product.target}
- 核心卖点: ${product.sellingPoint}

【创作要求】
1. 参考数据库中的爆款结构
2. 使用经过验证的标题套路和写作风格
3. 融入流量密码元素
4. 针对目标受众的痛点
5. 包含分镜表格
6. 总时长3-4分钟

【输出格式】
1. 视频标题
2. 黄金3秒钩子
3. 完整口播脚本（按时间段）
4. 分镜表格
5. BGM推荐
6. 话题标签

请输出完整的原创脚本。
`;

  const response = await fetch(`${CONFIG.ai302.base_url}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.ai302.api_key}`,
    },
    body: JSON.stringify({
      model: 'gemini-3-flash-preview',
      messages: [
        { role: 'system', content: '你是一位资深的短视频脚本策划师，擅长基于数据创作爆款脚本。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * 保存到数据库
 */
function saveToDatabase(video, analysis) {
  const dbDir = path.join(__dirname, '../database/videos');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  const dbPath = path.join(dbDir, `${video.aweme_id}_analysis.json`);
  
  const data = {
    video_id: video.aweme_id,
    video_info: video,
    analysis: parseAnalysis(analysis),
    created_at: new Date().toISOString(),
  };
  
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * 解析分析文本为结构化数据
 */
function parseAnalysis(analysisText) {
  // 简化解析，实际应该用更复杂的正则
  return {
    raw: analysisText,
    '1_核心主题': extractField(analysisText, '核心主题'),
    '2_一句话总结': extractField(analysisText, '一句话总结'),
    '3_爆款理由': extractList(analysisText, '爆款理由'),
    '4_标题套路': extractList(analysisText, '标题套路'),
    '5_写作风格': extractList(analysisText, '写作风格'),
    '6_流量密码': extractList(analysisText, '流量密码'),
    '7_金句摘录': extractList(analysisText, '金句摘录'),
    '8_开头手法': {},
    '9_结构脉络': [],
    '10_核心观点': extractList(analysisText, '核心观点'),
    '11_目标受众': {},
  };
}

function extractField(text, field) {
  const match = text.match(new RegExp(`${field}[：:]\s*(.+?)(?=\n\d+\.|$)`, 's'));
  return match ? match[1].trim() : '';
}

function extractList(text, field) {
  const match = text.match(new RegExp(`${field}[：:]([\s\S]+?)(?=\n\d+\.|$)`));
  if (!match) return [];
  return match[1].split(/\n/).map(s => s.replace(/^\s*[-\d.]+\s*/, '').trim()).filter(s => s);
}

/**
 * 加载数据库
 */
function loadDatabase() {
  const dbDir = path.join(__dirname, '../database/videos');
  
  if (!fs.existsSync(dbDir)) {
    return [];
  }
  
  const files = fs.readdirSync(dbDir).filter(f => f.endsWith('_analysis.json'));
  
  return files.map(f => {
    const content = fs.readFileSync(path.join(dbDir, f), 'utf8');
    return JSON.parse(content);
  });
}

/**
 * 保存脚本
 */
function saveScript(script, video, type) {
  const outputDir = path.join(__dirname, '../generated_scripts');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${type}_${video.aweme_id}_${timestamp}.md`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, script, 'utf8');
  
  return filepath;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args.join(' ');
  
  if (!command) {
    console.log('用法: node process-command.js "【拆解】1,2"');
    console.log('      node process-command.js "【仿写】2"');
    console.log('      node process-command.js "【原创】AIGC时代的内容焦虑"');
    process.exit(1);
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log('🤖 指令处理中心');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log(`📩 收到指令: ${command}\n`);
  
  const parsed = parseCommand(command);
  
  if (!parsed) {
    console.log('❌ 无法解析指令，请使用以下格式：');
    console.log('   【拆解】1,2,3');
    console.log('   【仿写】2');
    console.log('   【原创】主题');
    process.exit(1);
  }
  
  try {
    const queue = loadQueue();
    
    if (parsed.type === '拆解') {
      if (!queue || !queue.videos.length) {
        console.log('⚠️ 当前没有待处理的视频队列');
        console.log('   请先运行每日监控获取视频列表');
        process.exit(1);
      }
      await execute拆解(parsed.indices, queue.videos);
      
    } else if (parsed.type === '仿写') {
      if (!queue || !queue.videos.length) {
        console.log('⚠️ 当前没有待处理的视频队列');
        process.exit(1);
      }
      await execute仿写(parsed.index, queue.videos);
      
    } else if (parsed.type === '原创') {
      await execute原创(parsed.topic);
    }
    
    console.log('\n✅ 指令执行完成！');
    
  } catch (error) {
    console.error('\n❌ 执行失败:', error.message);
    process.exit(1);
  }
}

// 执行
main().catch(console.error);
