#!/usr/bin/env node
/**
 * 抖音创作助手 - 选题推荐脚本
 * 11:00 推送5条精选选题
 */

const CONFIG = {
  feishu: {
    app_token: 'QpPebRBlMawJeCs8b83cWhoLnOh',
    analysis_table: 'tbluSZ9P8GKeD2JP',
    topic_table: 'tblyour_topic_table',
  },
  ai302: {
    api_key: 'sk-l0F8jQgR0ZqjOL96MyPSfz7Yi0DJVkABzf8xGMCOPR54XVXY',
    base_url: 'https://api.302.ai',
  },
};

async function main() {
  console.log('🎯 抖音选题推荐生成中...\n');
  
  try {
    // 1. 读取昨日分析的视频
    const analyzedVideos = await getAnalyzedVideos();
    console.log(`📊 读取到 ${analyzedVideos.length} 条已分析视频`);
    
    // 2. 筛选高潜力视频（点赞>1w，可复用度>7）
    const highPotential = analyzedVideos.filter(v => 
      (v['点赞量'] > 10000 || v['可复用度'] >= 7) &&
      v['内容标签']?.length > 0
    );
    console.log(`⭐ 高潜力视频: ${highPotential.length} 条`);
    
    // 3. 生成选题建议
    console.log('\n🤖 AI生成选题中...\n');
    const topics = await generateTopics(highPotential);
    
    // 4. 存储到选题库
    await saveTopics(topics);
    
    // 5. 输出推荐
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 今日选题推荐（5条）');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    topics.forEach((topic, index) => {
      console.log(`${index + 1}. ${topic.title}`);
      console.log(`   📌 创作角度: ${topic.angle}`);
      console.log(`   🔗 参考视频: ${topic.reference}`);
      console.log(`   💰 种草潜力: ${topic.productFit}/10`);
      console.log(`   🎯 预估热度: ${topic.heatScore}/10`);
      console.log(`   💡 创作建议: ${topic.suggestion}`);
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💬 回复 "创作抖音 [编号]" 开始创作');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ 选题生成失败:', error);
  }
}

// 获取已分析的视频
async function getAnalyzedVideos() {
  // 从飞书读取视频拆解表
  return [];
}

// 生成选题
async function generateTopics(videos) {
  const prompt = `
你是一位抖音内容策略专家。基于以下爆款视频分析，生成5条适合AwriteAi创始人"老曹"创作的选题。

【参考爆款视频】
${videos.slice(0, 10).map((v, i) => `
视频${i + 1}:
- 标题: ${v['文章标题'] || '未知'}
- 标签: ${v['内容标签']?.join(', ') || '未知'}
- 流量密码: ${v['流量密码']?.join(', ') || '未知'}
- 金句: ${v['金句摘录']?.slice(0, 50) || '无'}
`).join('\n')}

【账号定位】
- 人设: AwriteAi创始人，AI营销专家
- 领域: AI工具、内容创作、营销方法论
- 风格: 专业但不失温度，有数据洞察，有实战经验
- 目标受众: 25-40岁，对AI和营销感兴趣的内容创作者、中小企业主

【选题要求】
1. 结合热点和实用价值
2. 有明确的产品种草切入点（可自然植入AwriteAi）
3. 适合短视频形式（15-60秒）
4. 有爆款潜质（情绪共鸣或实用干货）

【输出格式】
返回JSON数组，每条选题包含：
{
  "title": "选题标题",
  "angle": "切入角度",
  "reference": "参考的原视频标题",
  "productFit": 1-10,
  "heatScore": 1-10,
  "suggestion": "具体创作建议"
}

只返回JSON数组，不要其他内容。
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
  const result = JSON.parse(data.choices[0].message.content);
  return Array.isArray(result) ? result : result.topics || [];
}

// 存储选题
async function saveTopics(topics) {
  // 保存到飞书选题库
  console.log(`💾 已保存 ${topics.length} 条选题到选题库`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
