#!/usr/bin/env node
/**
 * 使用Istero API下载视频示例
 * 
 * 用法: node download-video.js "视频链接"
 * 
 * 支持平台: 抖音、小红书、快手、B站、YouTube等
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
  token: ENV.ISTERO_TOKEN,
  base_url: ENV.ISTERO_BASE_URL || 'https://api.istero.com',
};

/**
 * 使用Istero API获取视频下载地址
 */
async function getVideoDownloadUrl(videoUrl) {
  console.log('🔍 正在解析视频...');
  
  const response = await fetch(`${CONFIG.base_url}/resource/v2/video/analysis`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `url=${encodeURIComponent(videoUrl)}`,
  });
  
  const data = await response.json();
  
  if (data.code !== 200) {
    throw new Error(`解析失败: ${data.message}`);
  }
  
  console.log('✅ 解析成功');
  console.log(`📱 平台: ${data.data.platformName}`);
  console.log(`📝 标题: ${data.data.title.slice(0, 60)}...`);
  
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
async function downloadVideo(downloadUrl, outputPath) {
  console.log('\n📥 正在下载视频...');
  
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status}`);
  }
  
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  
  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  console.log(`✅ 下载完成: ${sizeMB} MB`);
  console.log(`💾 保存路径: ${outputPath}`);
  
  return outputPath;
}

/**
 * 主函数
 */
async function main() {
  const videoUrl = process.argv[2];
  
  if (!videoUrl) {
    console.log('❌ 请提供视频链接');
    console.log('用法: node download-video.js "https://www.douyin.com/video/xxxxx"');
    process.exit(1);
  }
  
  try {
    // 1. 解析视频
    const videoInfo = await getVideoDownloadUrl(videoUrl);
    
    // 2. 创建输出目录
    const outputDir = path.join(__dirname, '../downloads');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 3. 生成文件名
    const sanitizedTitle = videoInfo.title.replace(/[^\w\s-]/g, '').slice(0, 50);
    const outputPath = path.join(outputDir, `${sanitizedTitle}.mp4`);
    
    // 4. 下载视频
    await downloadVideo(videoInfo.downloadUrl, outputPath);
    
    console.log('\n🎉 全部完成！');
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

main();
