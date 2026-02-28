#!/usr/bin/env node
/**
 * 基于视频拆解数据库生成创作脚本
 * 用法: node generate-from-db.js [video_id] [product_name]
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  ai302: {
    api_key: 'sk-l0F8jQgR0ZqjOL96MyPSfz7Yi0DJVkABzf8xGMCOPR54XVXY',
    base_url: 'https://api.302.ai',
  }
};

/**
 * 从数据库读取视频拆解
 */
function loadVideoAnalysis(videoId) {
  const dbPath = path.join(__dirname, '../database/videos', `${videoId}_analysis.json`);
  
  if (!fs.existsSync(dbPath)) {
    throw new Error(`视频拆解不存在: ${videoId}`);
  }
  
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

/**
 * 基于数据库生成创作脚本
 */
async function generateScript(videoId, productInfo) {
  console.log(`🎬 基于视频拆解生成创作脚本...`);
  console.log(`   参考视频: ${videoId}`);
  console.log(`   新产品: ${productInfo.name}\n`);
  
  // 加载视频拆解
  const videoDB = loadVideoAnalysis(videoId);
  const analysis = videoDB.analysis;
  const reusability = videoDB.reusability;
  
  // 构建Prompt
  const prompt = `
请基于以下视频拆解数据，为【${productInfo.name}】创作一个类似风格的视频脚本。

【参考视频信息】
- 原标题: ${videoDB.basic_stats.title}
- 作者: ${videoDB.author}
- 数据表现: 点赞${videoDB.basic_stats.likes} | 分享${videoDB.basic_stats.shares} | 收藏${videoDB.basic_stats.collects} | 互动率${videoDB.basic_stats.engagement_rate}

【11维度拆解数据】

1. **核心主题**: ${analysis['1_核心主题']}

2. **一句话总结**: ${analysis['2_一句话总结']}

3. **爆款理由**: 
${analysis['3_爆款理由'].map(r => '   - ' + r).join('\n')}

4. **标题套路**: ${analysis['4_标题套路'].join('、')}

5. **写作风格**: ${analysis['5_写作风格'].join('、')}

6. **流量密码**: ${analysis['6_流量密码'].join('、')}

7. **金句摘录**:
${analysis['7_金句摘录'].map(q => '   - ' + q).join('\n')}

8. **开头手法**:
   - 时间: ${analysis['8_开头手法'].时间}
   - 技巧: ${analysis['8_开头手法'].技巧}
   - 口播: ${analysis['8_开头手法'].口播}

9. **结构脉络**:
${analysis['9_结构脉络'].map(s => `   ${s.时间段} | ${s.阶段} | ${s.情绪}`).join('\n')}

10. **核心观点**:
${analysis['10_核心观点'].map(v => '   - ' + v).join('\n')}

11. **目标受众**: ${analysis['11_目标受众'].主要人群}
   细分人群: ${analysis['11_目标受众'].细分.join('、')}
   痛点: ${analysis['11_目标受众'].痛点}

【可复用元素】
- 结构模板: ${reusability['可复用结构']}
- 金句模板: 
${reusability['可复用金句模板'].map(t => '   - ' + t).join('\n')}
- 标题公式: ${reusability['可复用标题公式']}
- 情绪曲线: ${reusability['情绪曲线模板']}

【新产品信息】
- 产品名称: ${productInfo.name}
- 核心功能: ${productInfo.features}
- 目标用户: ${productInfo.target}
- 核心卖点: ${productInfo.sellingPoint}
- 定价: ${productInfo.pricing}
- CTA: ${productInfo.cta}

【创作要求】
1. 严格参考原视频的结构脉络（五段论）
2. 使用类似的标题套路和写作风格
3. 保留原视频的情绪曲线设计（压抑→惊喜→震撼→自豪→燃）
4. 基于金句模板创作新的金句（保留\"中国也有了...\"句式）
5. 适应新产品的特点和目标受众
6. 总时长控制在3-4分钟
7. 给出分镜表格（时间|画面|口播|字幕）

【输出格式】
1. 视频标题（主标题+副标题）
2. 黄金3秒钩子
3. 完整口播脚本（按时间段划分，严格遵循五段论结构）
4. 分镜表格
5. BGM推荐
6. 话题标签建议
`;

  console.log('🤖 调用Gemini 3 Flash生成脚本...\n');
  
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
          role: 'system', 
          content: '你是一位资深的短视频脚本策划师，擅长基于爆款视频拆解数据创作仿写脚本。' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });
  
  const data = await response.json();
  const script = data.choices?.[0]?.message?.content || '';
  
  console.log('   ✅ 脚本生成完成\n');
  
  return script;
}

/**
 * 保存生成的脚本
 */
function saveScript(videoId, productName, script) {
  const outputDir = path.join(__dirname, '../generated_scripts');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${videoId}_${productName.replace(/\s+/g, '_')}_${timestamp}.md`;
  const filepath = path.join(outputDir, filename);
  
  const content = `# 基于视频拆解生成的脚本

## 参考视频
- 视频ID: ${videoId}
- 原视频: 卡兹克《Seedance 2.0》

## 新产品
- 产品名称: ${productName}

## 生成时间
${new Date().toLocaleString('zh-CN')}

---

${script}
`;
  
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`💾 脚本已保存: ${filepath}`);
  
  return filepath;
}

/**
 * 主函数
 */
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🎬 基于视频拆解数据库生成创作脚本');
  console.log('═══════════════════════════════════════════════════\n');
  
  // 获取参数
  const videoId = process.argv[2] || '7605965075261754624';
  const productName = process.argv[3] || 'AwriteAi';
  
  // 产品信息配置
  const productInfo = {
    name: productName,
    features: '一键生成多平台文案、爆款标题、智能选题、数据分析',
    target: '内容创作者、营销人员、中小企业主',
    sellingPoint: '节省80%文案时间，提升3倍点击转化率',
    pricing: '免费试用7天，月付99元起',
    cta: '评论区扣1领7天免费试用',
  };
  
  try {
    // 生成脚本
    const script = await generateScript(videoId, productInfo);
    
    // 保存脚本
    const filepath = saveScript(videoId, productName, script);
    
    // 输出预览
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ 脚本生成完成！');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📄 脚本预览:\n');
    console.log(script.slice(0, 1000) + '\n...\n');
    
    console.log(`💾 完整脚本: ${filepath}\n`);
    
  } catch (error) {
    console.error('\n❌ 生成失败:', error.message);
    process.exit(1);
  }
}

// 执行
main().catch(console.error);
