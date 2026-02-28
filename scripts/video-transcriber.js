#!/usr/bin/env node
/**
 * 视频音频转录工具
 * 下载视频并提取口播文本
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  ai302: {
    api_key: 'sk-l0F8jQgR0ZqjOL96MyPSfz7Yi0DJVkABzf8xGMCOPR54XVXY',
    base_url: 'https://api.302.ai',
  }
};

/**
 * 提取视频口播文本
 * @param {string} videoUrl - 视频播放地址
 * @param {string} videoId - 视频ID（用于文件名）
 * @returns {Promise<string>} - 转录文本
 */
async function transcribeVideo(videoUrl, videoId) {
  console.log(`🎬 开始处理视频: ${videoId}`);
  console.log(`   URL: ${videoUrl.slice(0, 80)}...`);
  
  try {
    // 调用302 AI音频转录API
    const response = await fetch(`${CONFIG.ai302.base_url}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.ai302.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'vc',  // 音频转文字模型
        file: videoUrl,  // 视频URL
        response_format: 'text',
        language: 'zh',  // 中文
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`转录API错误: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    const transcript = data.text || '';
    
    console.log(`   ✅ 转录完成，文本长度: ${transcript.length} 字符`);
    
    // 保存到文件
    const outputDir = path.join(__dirname, '../transcripts');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `${videoId}_transcript.txt`);
    fs.writeFileSync(outputFile, transcript, 'utf8');
    console.log(`   💾 已保存到: ${outputFile}`);
    
    return transcript;
    
  } catch (error) {
    console.error(`   ❌ 转录失败: ${error.message}`);
    throw error;
  }
}

/**
 * 完整的视频分析流程
 * @param {Object} videoInfo - 视频信息对象
 */
async function analyzeVideoFull(videoInfo) {
  console.log('\n═══════════════════════════════════════');
  console.log('📹 抖音视频完整分析流程');
  console.log('═══════════════════════════════════════\n');
  
  const { aweme_id, desc, video } = videoInfo;
  
  // Step 1: 获取视频播放地址
  console.log('【Step 1/4】获取视频播放地址...');
  const videoUrl = video?.play_addr?.url_list?.[0];
  if (!videoUrl) {
    throw new Error('未找到视频播放地址');
  }
  console.log('   ✅ 视频地址获取成功');
  
  // Step 2: 音频转录（提取口播文本）
  console.log('\n【Step 2/4】音频转录（提取口播文本）...');
  const transcript = await transcribeVideo(videoUrl, aweme_id);
  
  // Step 3: AI分析口播文本
  console.log('\n【Step 3/4】AI分析口播结构...');
  const analysis = await analyzeTranscript(transcript, desc);
  
  // Step 4: 生成创作建议
  console.log('\n【Step 4/4】生成创作建议...');
  const suggestions = await generateSuggestions(analysis);
  
  // 保存完整分析报告
  const report = {
    video_id: aweme_id,
    video_desc: desc,
    transcript,
    analysis,
    suggestions,
    created_at: new Date().toISOString(),
  };
  
  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportFile = path.join(reportDir, `${aweme_id}_report.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
  
  console.log('\n═══════════════════════════════════════');
  console.log('✅ 视频分析完成！');
  console.log(`📄 报告保存: ${reportFile}`);
  console.log('═══════════════════════════════════════\n');
  
  return report;
}

/**
 * 分析口播文本
 */
async function analyzeTranscript(transcript, videoDesc) {
  const prompt = `
你是一位资深的抖音内容分析师。请分析以下视频口播文本，提取关键信息：

【视频描述】
${videoDesc}

【口播文本】
${transcript.slice(0, 5000)}

【分析要求】
请按以下维度分析：

1. **内容主题**：视频核心讲什么？
2. **开头钩子**：前3秒如何吸引观众？
3. **结构框架**：视频如何组织？（痛点-方案-案例-升华？）
4. **情绪曲线**：哪些地方有情感起伏？
5. **金句摘录**：有哪些值得学习的表达？
6. **产品植入方式**：如果是带货/种草，产品如何植入？
7. **CTA设计**：如何引导互动/转化？
8. **可复用元素**：哪些套路可以直接借鉴？
9. **适合仿写的主题**：基于这个结构，可以创作什么类似内容？

请用中文详细分析，条理清晰。
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
  return data.choices?.[0]?.message?.content || '';
}

/**
 * 生成创作建议
 */
async function generateSuggestions(analysis) {
  const prompt = `
基于以上分析，请为AwriteAi创作工具生成具体的视频脚本建议：

【要求】
1. 参考上述爆款结构
2. 结合AwriteAi产品特点（AI写作、选题、多平台分发）
3. 生成3个不同角度的创作方向
4. 每个方向包含：标题建议 + 开头钩子 + 核心结构

【AwriteAi产品信息】
- 核心功能：一键生成多平台文案、爆款标题、智能选题、数据分析
- 目标用户：内容创作者、营销人员、中小企业主
- 核心价值：节省80%文案时间，提升3倍点击转化率
- 定价：免费试用7天，月付99元起
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
        { role: 'user', content: `${analysis}\n\n${prompt}` }
      ],
      temperature: 0.8,
    }),
  });
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// 如果直接运行
if (require.main === module) {
  // 测试数据：卡兹克视频
  const testVideo = {
    aweme_id: '7605965075261754624',
    desc: '中国也有了世界第一的模型——Seedance 2.0 欢迎来到AIGC的青年时代！ #AI  #AIGC #AI新星计划 #AI视频 #seedance',
    video: {
      play_addr: {
        url_list: [
          'https://v11-cold1.douyinvod.com/ff698d30701a95a8d9c9956ae2cbe8ee/69a03759/video/tos/cn/tos-cn-ve-15/ok2E3LCbQtfeKfNEsmFYAfIOOwIDEaBrGz7uIA/'
        ]
      }
    }
  };
  
  analyzeVideoFull(testVideo).catch(console.error);
}

module.exports = { transcribeVideo, analyzeVideoFull };
