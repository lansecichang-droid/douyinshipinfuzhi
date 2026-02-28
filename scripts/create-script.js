#!/usr/bin/env node
/**
 * 抖音创作助手 - 脚本创作脚本
 * 根据选题生成完整抖音脚本
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  ai302: {
    api_key: 'sk-l0F8jQgR0ZqjOL96MyPSfz7Yi0DJVkABzf8xGMCOPR54XVXY',
    base_url: 'https://api.302.ai',
  },
};

// 产品资料包（可由用户配置）
const PRODUCT_KIT = {
  'AwriteAi': {
    name: 'AwriteAi',
    tagline: 'AI营销内容创作平台',
    coreFeatures: ['一键生成多平台文案', '爆款标题生成', '智能选题推荐', '数据分析洞察'],
    targetUsers: '内容创作者、营销人员、中小企业主',
    price: '免费试用7天，月付99元起',
    benefits: '节省80%文案时间，提升3倍点击转化率',
    proofPoints: ['已服务10万+创作者', '累计生成1000万+条文案'],
    cta: '评论区扣1领7天免费试用',
  }
};

async function createScript(options) {
  const { 
    topic,           // 选题内容
    product,         // 产品名称（可选）
    style = '干货',  // 风格：干货/种草/剧情/知识
    duration = 30,   // 时长：15/30/60/180秒
  } = options;
  
  console.log('🎬 开始创作抖音脚本...\n');
  console.log(`📌 选题: ${topic.title || topic}`);
  console.log(`🎨 风格: ${style}`);
  console.log(`⏱️ 时长: ${duration}秒`);
  if (product) console.log(`💼 产品: ${product}`);
  console.log('');
  
  // 获取产品信息
  const productInfo = product ? PRODUCT_KIT[product] : null;
  
  // 生成脚本
  const script = await generateScriptContent(topic, productInfo, style, duration);
  
  // 生成视觉建议
  const visualGuide = await generateVisualGuide(script, duration);
  
  // 生成BGM建议
  const bgmSuggestion = generateBGMSuggestion(style);
  
  // 输出结果
  outputScript(script, visualGuide, bgmSuggestion, productInfo);
  
  return { script, visualGuide, bgmSuggestion };
}

// 生成脚本内容
async function generateScriptContent(topic, productInfo, style, duration) {
  const productPrompt = productInfo ? `
【产品信息】
- 产品名: ${productInfo.name}
- 核心卖点: ${productInfo.coreFeatures.join('、')}
- 目标用户: ${productInfo.targetUsers}
- 价格: ${productInfo.price}
- 核心收益: ${productInfo.benefits}
- 信任背书: ${productInfo.proofPoints.join('，')}
- 行动号召: ${productInfo.cta}

要求：
- 产品植入要自然，不要硬广
- 在「解决方案」或「行动号召」环节自然带出产品
- 强调使用前后的对比效果
` : '';

  const prompt = `
你是一位抖音爆款脚本创作专家。请创作一条${duration}秒的抖音短视频脚本。

【选题】
${topic.title || topic}
${topic.angle ? `切入角度: ${topic.angle}` : ''}

【风格】
${style}
${productPrompt}

【脚本结构要求】
1. 黄金3秒（0-3秒）：强钩子，留住用户
2. 痛点共鸣（3-10秒）：引发情绪共鸣
3. 解决方案（10-${Math.floor(duration * 0.6)}秒）：干货内容或产品展示
4. 效果证明（${Math.floor(duration * 0.6)}-${Math.floor(duration * 0.8)}秒）：数据/对比/案例
5. 行动号召（${Math.floor(duration * 0.8)}-${duration}秒）：引导互动/关注/转化

【输出格式】
返回JSON格式：
{
  "title": "视频标题（带emoji）",
  "duration": ${duration},
  "sections": [
    {
      "time": "0-3秒",
      "scene": "画面描述",
      "copy": "口播文案",
      "subtitle": "字幕文字（带关键词高亮）",
      "key_point": "这一段的核心技巧"
    }
  ],
  "hashtags": ["话题标签1", "话题标签2"],
  "caption": "发布文案"
}

【要求】
- 文案口语化，适合口播
- 每句控制在15字以内，方便字幕展示
- 使用emoji增强表达
- 字幕中要有关键词高亮（用【】标记）
- 黄金3秒必须有冲击力

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

// 生成视觉指导
async function generateVisualGuide(script, duration) {
  const prompt = `
基于以下抖音脚本，生成详细的视觉拍摄/制作指导。

【脚本标题】
${script.title}

【脚本内容】
${script.sections.map(s => `${s.time}: ${s.scene} - ${s.copy}`).join('\n')}

【输出要求】
返回以下维度的建议（JSON格式）：
{
  "camera_work": ["镜头运镜建议1", "建议2"], // 推/拉/摇/移/跟等
  "lighting": "灯光布置建议",
  "props": ["需要准备的道具1", "道具2"],
  "editing": ["剪辑技巧1", "技巧2"],
  "text_animation": "字幕动画效果建议",
  "special_effects": ["特效使用建议1", "建议2"],
  "thumbnail": {
    "concept": "封面图设计概念",
    "elements": ["封面元素1", "元素2"],
    "text": "封面大字标题"
  }
}

只返回JSON。
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

// 生成BGM建议
function generateBGMSuggestion(style) {
  const bgmMap = {
    '干货': {
      type: '快节奏纯音乐',
      examples: ['《The Benny Hill Show》快节奏版', '《Wobble》', '抖音热门BGM榜'],
      tempo: '120-130 BPM',
      mood: '紧张、期待、恍然大悟'
    },
    '种草': {
      type: '轻快活泼音乐',
      examples: ['《Sunshine》', '《Happy》', '近期热门种草BGM'],
      tempo: '100-120 BPM',
      mood: '轻松、愉悦、向往'
    },
    '剧情': {
      type: '情绪递进音乐',
      examples: ['悬疑类BGM', '反转类音乐', '故事叙述类'],
      tempo: '根据情节变化',
      mood: '悬念、冲突、释放'
    },
    '知识': {
      type: '沉稳专业音乐',
      examples: ['轻音乐', '钢琴曲', '科技感音乐'],
      tempo: '80-100 BPM',
      mood: '专业、可信、启发'
    }
  };
  
  return bgmMap[style] || bgmMap['干货'];
}

// 输出脚本
function outputScript(script, visualGuide, bgm, productInfo) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎬 ${script.title}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 分镜脚本
  console.log('📱 分镜脚本:\n');
  script.sections.forEach((section, index) => {
    console.log(`【${section.time}】${section.key_point || `第${index + 1}段`}`);
    console.log(`🎥 画面: ${section.scene}`);
    console.log(`🎤 口播: ${section.copy}`);
    console.log(`💬 字幕: ${section.subtitle}`);
    console.log('');
  });
  
  // 视觉指导
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎨 视觉制作指南:\n');
  console.log(`📷 镜头: ${visualGuide.camera_work?.join('、') || '根据分镜自由发挥'}`);
  console.log(`💡 灯光: ${visualGuide.lighting || '自然光或环形灯'}`);
  console.log(`🎯 道具: ${visualGuide.props?.join('、') || '根据内容准备'}`);
  console.log(`✂️ 剪辑: ${visualGuide.editing?.join('、') || '快节奏剪辑，2-3秒一切'}`);
  console.log(`🎵 BGM: ${bgm.type} (${bgm.tempo})`);
  console.log(`   推荐: ${bgm.examples.join('、')}`);
  console.log('');
  
  // 封面图
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🖼️ 封面图设计:\n');
  console.log(`概念: ${visualGuide.thumbnail?.concept || '大字标题+人物表情'}`);
  console.log(`元素: ${visualGuide.thumbnail?.elements?.join('、') || '人物+关键词'}`);
  console.log(`标题: ${visualGuide.thumbnail?.text || script.title}`);
  console.log('');
  
  // 发布文案
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 发布文案:\n');
  console.log(script.caption);
  console.log('');
  console.log(`#${script.hashtags?.join(' #') || '#AI #内容创作 #抖音运营'}`);
  console.log('');
  
  // 产品植入提示
  if (productInfo) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💼 产品植入提示:\n');
    console.log(`产品: ${productInfo.name}`);
    console.log(`植入时机: ${script.sections.find(s => s.copy.includes(productInfo.name))?.time || '根据内容自然植入'}`);
    console.log(`行动号召: ${productInfo.cta}`);
    console.log('');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 脚本创作完成！');
  console.log('💡 需要生成素材图片/视频？回复 "生成素材"');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// 命令行执行
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    topic: args[0] || '如何用小团队做出大内容',
    product: args.find(a => a.startsWith('--product='))?.split('=')[1],
    style: args.find(a => a.startsWith('--style='))?.split('=')[1] || '干货',
    duration: parseInt(args.find(a => a.startsWith('--duration='))?.split('=')[1]) || 30,
  };
  
  createScript(options);
}

module.exports = { createScript };
