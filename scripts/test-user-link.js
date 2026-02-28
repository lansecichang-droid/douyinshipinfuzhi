#!/usr/bin/env node
/**
 * 测试用户提供的抖音链接 - 尝试多种格式
 */

const API_KEY = 'JZL34425f12232a7000';
const BASE_URL = 'https://www.dajiala.com';

// 测试链接
const TEST_URL = 'https://v.douyin.com/EY1hUgT2_4o/';

async function jizhileRequest(endpoint, body) {
  const url = `${BASE_URL}${endpoint}?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  return await response.json();
}

async function main() {
  console.log('🔍 测试链接:', TEST_URL);
  console.log('');
  
  // 尝试多种参数格式
  const tests = [
    { name: 'url参数', body: { url: TEST_URL } },
    { name: 'link参数', body: { link: TEST_URL } },
    { name: 'share_url参数', body: { share_url: TEST_URL } },
    { name: 'video_url参数', body: { video_url: TEST_URL } },
    { name: 'short_link参数', body: { short_link: TEST_URL } },
    { name: 'douyin_url参数', body: { douyin_url: TEST_URL } },
  ];
  
  console.log('1️⃣ 测试视频详情接口...\n');
  
  for (const test of tests) {
    try {
      console.log(`   测试: ${test.name}`);
      const result = await jizhileRequest('/fbmain/monitor/v3/douyin_aweme_detail', test.body);
      
      if (result.code === 0 || result.code === 200) {
        console.log(`   ✅ 成功！`);
        if (result.data?.aweme_detail) {
          const detail = result.data.aweme_detail;
          console.log(`      标题: ${detail.desc?.slice(0, 40)}...`);
          console.log(`      作者: ${detail.author?.nickname}`);
          console.log(`      点赞: ${detail.statistics?.digg_count}`);
          
          // 保存成功参数名
          console.log(`\n💡 正确的参数名是: "${Object.keys(test.body)[0]}"`);
        }
        break;
      } else {
        console.log(`   ❌ ${result.msg || result.message}`);
      }
    } catch (err) {
      console.log(`   ❌ 错误: ${err.message}`);
    }
  }
  
  console.log('\n2️⃣ 测试用户主页接口...\n');
  
  const userTests = [
    { name: 'url参数', body: { url: TEST_URL, page: 1, page_size: 5 } },
    { name: 'share_url参数', body: { share_url: TEST_URL, page: 1, page_size: 5 } },
    { name: 'homepage参数', body: { homepage: TEST_URL, page: 1, page_size: 5 } },
  ];
  
  for (const test of userTests) {
    try {
      console.log(`   测试: ${test.name}`);
      const result = await jizhileRequest('/fbmain/monitor/v3/douyin_user_post', test.body);
      
      if (result.code === 0 || result.code === 200) {
        console.log(`   ✅ 成功！`);
        if (result.data?.aweme_list) {
          console.log(`      共 ${result.data.aweme_list.length} 条视频`);
          
          // 打印最新几条
          result.data.aweme_list.slice(0, 3).forEach((v, i) => {
            console.log(`      ${i+1}. ${v.desc?.slice(0, 30)}... (${v.statistics?.digg_count}赞)`);
          });
          
          console.log(`\n🎉 该链接可用于监控！`);
          console.log(`\n建议添加到监控配置:`);
          const firstVideo = result.data.aweme_list[0];
          if (firstVideo) {
            console.log(`   昵称: ${firstVideo.author?.nickname}`);
            console.log(`   sec_uid: ${firstVideo.author?.sec_uid}`);
          }
        }
        break;
      } else {
        console.log(`   ❌ ${result.msg || result.message}`);
      }
    } catch (err) {
      console.log(`   ❌ 错误: ${err.message}`);
    }
  }
}

main().catch(console.error);
