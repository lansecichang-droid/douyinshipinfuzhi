#!/usr/bin/env node
/**
 * 视频完整分析流程 - 使用 Gemini 3 Flash 多模态分析
 * 替代方案：不再使用音频转录，直接使用AI分析视频元数据+视觉信息
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  istero: {
    token: 'mNCuhmkpbyxOQHDLDLgeJcAheJzoSEoi',
    base_url: 'https://api.istero.com',
  },
  ai302: {
    api_key: 'sk-l0F8jQgR0ZqjOL96MyPSfz7Yi0DJVkABzf8xGMCOPR54XVXY',
    base_url: 'https://api.302.ai',
  }
};

/**
 * 使用 Gemini 3 Flash 分析视频内容（多模态）
 * 直接上传视频文件进行分析
 */
async function analyzeVideoWithGemini(videoPath, videoInfo) {
  console.log('\n🎬 Step 3: 使用 Gemini 3 Flash 多模态分析视频...');
  console.log('   上传视频文件进行AI分析...');
  
  try {
    // 读取视频文件（转为base64或binary）
    const videoData = fs.readFileSync(videoPath);
    const videoBase64 = videoData.toString('base64');
    
    console.log(`   视频大小: ${(videoData.length / 1024 / 1024).toFixed(2)} MB`);
    
    // 使用 Gemini 3 Flash 多模态API分析视频
    const response = await fetch(`${CONFIG.ai302.base_url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.ai302.api_key}`,
      },
      body: JSON.stringify({
        model: 'gemini-3-flash-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `请深度分析这个抖音视频的内容结构和口播文案。

【视频信息】
- 标题: ${videoInfo.title}
- 作者: ${videoInfo.author}
- 点赞: ${videoInfo.likes} | 分享: ${videoInfo.shares} | 收藏: ${videoInfo.collects}

【分析要求】
请详细分析：
1. **完整口播文本** - 尽可能还原视频的口播内容
2. **开头钩子** - 前3秒如何吸引观众
3. **结构框架** - 视频如何组织（痛点-方案-演示-升华-CTA）
4. **情绪曲线** - 情感起伏点在哪里
5. **金句摘录** - 3-5个精彩表达
6. **产品植入方式** - 如何自然介绍产品
7. **CTA设计** - 如何引导互动
8. **视觉元素** - 画面如何配合口播

请尽可能详细地还原口播文本，这对后续仿写非常重要。`
              },
              {
                type: 'video_url',  // 或者使用 video 类型上传base64
                video_url: {
                  url: `data:video/mp4;base64,${videoBase64.slice(0, 100000)}` // 截取前100KB避免过大
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI分析失败: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || '';
    
    console.log('   ✅ Gemini分析完成');
    console.log(`   分析文本长度: ${analysis.length} 字符`);
    
    // 保存分析结果
    const transcriptDir = path.join(__dirname, '../transcripts');
    if (!fs.existsSync(transcriptDir)) {
      fs.mkdirSync(transcriptDir, { recursive: true });
    }
    
    const videoId = path.basename(videoPath, '.mp4');
    const analysisPath = path.join(transcriptDir, `${videoId}_gemini_analysis.txt`);
    fs.writeFileSync(analysisPath, analysis, 'utf8');
    
    console.log(`   💾 已保存: ${analysisPath}`);
    
    return analysis;
    
  } catch (error) {
    console.error(`   ❌ Gemini分析失败: ${error.message}`);
    console.log('   ⚠️ 切换到备用方案: 基于元数据AI分析');
    return await analyzeBasedOnMetadata(videoInfo);
  }
}

/**
 * 备用方案：基于视频元数据进行分析
 */
async function analyzeBasedOnMetadata(videoInfo) {
  console.log('\n🤖 使用备用方案: 基于元数据AI分析...');
  
  const prompt = `
你是一位资深的抖音内容分析师，擅长拆解卡兹克（数字生命卡兹克）的爆款视频结构。

【视频信息】
- 标题: ${videoInfo.title}
- 作者: ${videoInfo.author}
- 点赞: ${videoInfo.likes} | 分享: ${videoInfo.shares} | 收藏: ${videoInfo.collects}
- 话题标签: ${videoInfo.tags?.join(', ') || 'AI, AIGC'}

【卡兹克风格特点】
- 科技博主，专注AI/AIGC领域
- 风格: 理性分析 + 情感共鸣
- 常用结构: 痛点引入 → 产品介绍 → 功能演示 → 真实案例 → 情怀升华 → CTA
- 语言风格: 直接、有冲击力、金句频出
- 擅长用"中国也有了..."等民族自豪感引发共鸣

【分析要求】
请详细分析：
1. **标题拆解**: 为什么这个标题能吸引人？
2. **开头钩子**: 卡兹克会如何开场？（推测前3秒）
3. **结构框架**: 完整的视频结构是怎样的？
4. **情绪曲线**: 如何调动观众情绪？
5. **金句设计**: 可能的金句有哪些？
6. **产品植入**: 产品如何自然植入？
7. **CTA设计**: 如何引导互动？
8. **爆款因子**: 为什么这条视频数据好？

【输出格式】
尽可能详细地还原口播文本和结构分析。
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
      max_tokens: 3000,
    }),
  });
  
  const data = await response.json();
  const analysis = data.choices?.[0]?.message?.content || '';
  
  console.log('   ✅ 元数据分析完成');
  
  return analysis;
}

/**
 * 生成AwriteAi仿写脚本
 */
async function generateAwriteAiScript(analysis, videoInfo) {
  console.log('\n✨ Step 4: 生成AwriteAi仿写脚本...');
  
  const prompt = `
基于以上分析，请为AwriteAi营销创作工具创作一个类似卡兹克风格的视频脚本。

【参考视频分析】
${analysis.slice(0, 2000)}

【AwriteAi产品信息】
- 核心功能: 一键生成多平台文案、爆款标题、智能选题、数据分析
- 目标用户: 内容创作者、营销人员、中小企业主
- 核心价值: 节省80%文案时间，提升3倍点击转化率
- 定价: 免费试用7天，月付99元起
- CTA: 评论区扣1领7天免费试用

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

【输出格式】
1. 视频标题（主标题+副标题）
2. 黄金3秒钩子
3. 完整口播脚本（分时间段）
4. 分镜表格
5. BGM推荐
6. 话题标签
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
 * 主流程
 */
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🎬 抖音视频完整分析流程 (Gemini 3 Flash版)');
  console.log('═══════════════════════════════════════════════════\n');
  
  const videoId = '7605965075261754624';
  const videoPath = path.join(__dirname, '../downloads', `${videoId}.mp4`);
  
  // 检查视频是否存在
  if (!fs.existsSync(videoPath)) {
    console.error(`❌ 视频文件不存在: ${videoPath}`);
    console.log('请先运行下载流程');
    process.exit(1);
  }
  
  const videoInfo = {
    title: '中国也有了世界第一的模型——Seedance 2.0 欢迎来到AIGC的青年时代！',
    author: '数字生命卡兹克',
    likes: 4956,
    shares: 671,
    collects: 1032,
    tags: ['AI', 'AIGC', 'AI新星计划', 'AI视频', 'seedance'],
  };
  
  try {
    // Step 3: 使用Gemini分析视频
    const analysis = await analyzeVideoWithGemini(videoPath, videoInfo);
    
    // Step 4: 生成脚本
    const script = await generateAwriteAiScript(analysis, videoInfo);
    
    // 保存报告
    const reportDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const report = {
      video_id: videoId,
      video_info: videoInfo,
      gemini_analysis: analysis,
      generated_script: script,
      created_at: new Date().toISOString(),
      model: 'gemini-3-flash-preview',
    };
    
    const reportPath = path.join(reportDir, `${videoId}_gemini_report.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    
    const scriptPath = path.join(reportDir, `${videoId}_awriteai_script_gemini.md`);
    fs.writeFileSync(scriptPath, script, 'utf8');
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ 完整分析流程结束！');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📊 分析结果:\n');
    console.log(analysis.slice(0, 800) + '...\n');
    
    console.log('🎬 生成的脚本:\n');
    console.log(script.slice(0, 800) + '...\n');
    
    console.log(`💾 报告保存: ${reportPath}`);
    console.log(`📝 脚本保存: ${scriptPath}`);
    
  } catch (error) {
    console.error('\n❌ 流程失败:', error.message);
    process.exit(1);
  }
}

// 执行
main().catch(console.error);
