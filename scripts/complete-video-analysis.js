#!/usr/bin/env node
/**
 * 视频完整分析流程 - 使用Istero下载 + 302 AI转录
 */

const fs = require('fs');
const path = require('path');

// 加载 .env 配置
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) {
      env[match[1]] = match[2].trim();
    }
  });
  
  return env;
}

const ENV = loadEnv();

const CONFIG = {
  istero: {
    token: ENV.ISTERO_TOKEN || 'mNCuhmkpbyxOQHDLDLgeJcAheJzoSEoi',
    base_url: ENV.ISTERO_BASE_URL || 'https://api.istero.com',
  },
  ai302: {
    api_key: ENV.AI302_API_KEY || 'sk-l0F8jQgR0ZqjOL96MyPSfz7Yi0DJVkABzf8xGMCOPR54XVXY',
    base_url: ENV.AI302_BASE_URL || 'https://api.302.ai',
  }
};

/**
 * 使用Istero API获取视频下载地址
 */
async function getVideoDownloadUrl(videoUrl) {
  console.log('🔍 Step 1: 解析视频下载地址...');
  
  const response = await fetch(`${CONFIG.istero.base_url}/resource/v2/video/analysis`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.istero.token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `url=${encodeURIComponent(videoUrl)}`,
  });
  
  const data = await response.json();
  
  if (data.code !== 200) {
    throw new Error(`Istero API错误: ${data.message}`);
  }
  
  console.log('   ✅ 获取成功');
  console.log(`   标题: ${data.data.title.slice(0, 50)}...`);
  console.log(`   平台: ${data.data.platformName}`);
  
  return {
    title: data.data.title,
    cover: data.data.cover,
    downloadUrl: data.data.url,
    platform: data.data.platformName,
  };
}

/**
 * 下载视频到本地
 */
async function downloadVideo(downloadUrl, videoId) {
  console.log('\n📥 Step 2: 下载视频...');
  
  const outputDir = path.join(__dirname, '../downloads');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, `${videoId}.mp4`);
  
  // 使用fetch下载
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status}`);
  }
  
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  
  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  console.log(`   ✅ 下载成功: ${sizeMB} MB`);
  console.log(`   保存路径: ${outputPath}`);
  
  return outputPath;
}

/**
 * 使用302 AI转录视频（直接上传视频文件）
 */
async function transcribeVideoFile(videoPath) {
  console.log('\n🎤 Step 3: 音频转录...');
  console.log('   上传视频到302 AI...');
  
  const videoData = fs.readFileSync(videoPath);
  
  // 创建multipart form data
  const boundary = '----FormBoundary' + Date.now();
  const formData = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="video.mp4"',
    'Content-Type: video/mp4',
    '',
    videoData.toString('binary'),
    `--${boundary}`,
    'Content-Disposition: form-data; name="model"',
    '',
    'whisper-1',
    `--${boundary}--`,
  ].join('\r\n');
  
  try {
    const response = await fetch(`${CONFIG.ai302.base_url}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.ai302.api_key}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`转录失败: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    const transcript = data.text || '';
    
    console.log(`   ✅ 转录完成`);
    console.log(`   文本长度: ${transcript.length} 字符`);
    
    // 保存转录文本
    const transcriptDir = path.join(__dirname, '../transcripts');
    if (!fs.existsSync(transcriptDir)) {
      fs.mkdirSync(transcriptDir, { recursive: true });
    }
    
    const videoId = path.basename(videoPath, '.mp4');
    const transcriptPath = path.join(transcriptDir, `${videoId}_transcript.txt`);
    fs.writeFileSync(transcriptPath, transcript, 'utf8');
    
    console.log(`   💾 已保存: ${transcriptPath}`);
    
    return transcript;
    
  } catch (error) {
    console.error(`   ❌ 转录失败: ${error.message}`);
    console.log('   ⚠️ 将使用备用方案：基于视频元数据生成分析');
    return null;
  }
}

/**
 * AI分析口播文本
 */
async function analyzeTranscript(transcript, videoInfo) {
  console.log('\n🤖 Step 4: AI分析视频结构...');
  
  const prompt = `
你是一位资深的抖音内容分析师。请分析以下视频口播文本，提取关键信息：

【视频标题】
${videoInfo.title}

【口播文本】
${transcript || '(转录失败，请基于标题和常见结构分析)'}

【分析要求】
请按以下维度详细分析：

1. **内容主题**：视频核心讲什么？（用1句话概括）
2. **开头钩子**：前3秒如何吸引观众？使用了什么技巧？
3. **结构框架**：视频如何组织？（例如：痛点-方案-案例-升华）
4. **情绪曲线**：哪些地方有情感起伏？如何调动观众情绪？
5. **金句摘录**：有哪些值得学习的精彩表达？（列出3-5句）
6. **产品植入方式**：如果是带货/种草，产品如何自然植入？
7. **CTA设计**：如何引导互动/转化？（评论/关注/购买）
8. **可复用元素**：哪些套路可以直接借鉴？
9. **爆款因子**：为什么这条视频会火？（数据：点赞${videoInfo.likes || 'N/A'}，分享${videoInfo.shares || 'N/A'}）
10. **适合仿写的主题**：基于这个结构，可以创作什么类似内容？给出3个方向

请用中文详细分析，条理清晰，有实操价值。
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
        { role: 'system', content: '你是一位专业的短视频内容分析师，擅长拆解爆款视频结构。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    }),
  });
  
  const data = await response.json();
  const analysis = data.choices?.[0]?.message?.content || '';
  
  console.log('   ✅ 分析完成');
  
  return analysis;
}

/**
 * 生成创作建议
 */
async function generateScript(analysis, videoInfo) {
  console.log('\n✨ Step 5: 生成AwriteAi创作脚本...');
  
  const prompt = `
基于以上分析，请为AwriteAi营销创作工具创作一个类似风格的视频脚本。

【参考视频信息】
- 标题：${videoInfo.title}
- 结构特点：${analysis.slice(0, 500)}...

【AwriteAi产品信息】
- 核心功能：一键生成多平台文案、爆款标题、智能选题、数据分析
- 目标用户：内容创作者、营销人员、中小企业主
- 核心价值：节省80%文案时间，提升3倍点击转化率
- 定价：免费试用7天，月付99元起
- CTA：评论区扣1领7天免费试用

【创作要求】
1. 标题要有冲击力（参考"中国也有了..."句式）
2. 开头3秒黄金钩子（制造悬念或冲突）
3. 产品介绍清晰，自然植入
4. 包含具体使用场景演示
5. 情感升华（内容创作者的痛点共鸣）
6. 结尾CTA（引导评论/关注）
7. 总时长控制在3-4分钟
8. 给出分镜建议（镜头+画面+口播）
9. 推荐BGM风格
10. 话题标签建议

请输出完整的视频脚本，包含：
- 视频标题（主标题+副标题）
- 黄金3秒钩子
- 完整口播脚本（分时间段）
- 分镜表格
- BGM推荐
- 话题标签
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
        { role: 'system', content: '你是一位资深的短视频脚本策划师，擅长创作科技类产品种草视频。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });
  
  const data = await response.json();
  const script = data.choices?.[0]?.message?.content || '';
  
  console.log('   ✅ 脚本生成完成');
  
  return script;
}

/**
 * 保存完整报告
 */
function saveReport(videoId, videoInfo, transcript, analysis, script) {
  console.log('\n💾 保存完整报告...');
  
  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const report = {
    video_id: videoId,
    video_info: videoInfo,
    transcript: transcript || '(转录失败)',
    analysis,
    generated_script: script,
    created_at: new Date().toISOString(),
  };
  
  const reportPath = path.join(reportDir, `${videoId}_full_report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  
  // 同时保存markdown格式的脚本
  const scriptPath = path.join(reportDir, `${videoId}_awriteai_script.md`);
  fs.writeFileSync(scriptPath, script, 'utf8');
  
  console.log(`   📄 JSON报告: ${reportPath}`);
  console.log(`   📝 脚本文件: ${scriptPath}`);
}

/**
 * 主流程
 */
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🎬 抖音视频完整分析流程 - 卡兹克视频');
  console.log('═══════════════════════════════════════════════════\n');
  
  const videoUrl = 'https://v.douyin.com/O8f2TWD9w9E/';
  const videoId = '7605965075261754624';
  
  try {
    // 视频信息（已从之前的API获取）
    const videoInfo = {
      title: '中国也有了世界第一的模型——Seedance 2.0 欢迎来到AIGC的青年时代！',
      likes: 4956,
      shares: 671,
      collects: 1032,
      comments: 148,
    };
    
    // Step 1: 获取下载地址
    const downloadInfo = await getVideoDownloadUrl(videoUrl);
    
    // Step 2: 下载视频
    const videoPath = await downloadVideo(downloadInfo.downloadUrl, videoId);
    
    // Step 3: 转录口播（如果转录失败，继续后续步骤）
    let transcript = null;
    try {
      transcript = await transcribeVideoFile(videoPath);
    } catch (err) {
      console.log(`   ⚠️ 转录跳过: ${err.message}`);
    }
    
    // Step 4: AI分析
    const analysis = await analyzeTranscript(transcript, videoInfo);
    
    // Step 5: 生成脚本
    const script = await generateScript(analysis, videoInfo);
    
    // 保存报告
    saveReport(videoId, videoInfo, transcript, analysis, script);
    
    // 输出结果
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ 完整分析流程结束！');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📊 分析结果预览:\n');
    console.log(analysis.slice(0, 500) + '...\n');
    
    console.log('🎬 生成的脚本预览:\n');
    console.log(script.slice(0, 500) + '...\n');
    
  } catch (error) {
    console.error('\n❌ 流程失败:', error.message);
    process.exit(1);
  }
}

// 执行
main().catch(console.error);
