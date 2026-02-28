#!/usr/bin/env node
/**
 * 极致了API 测试脚本
 * 用于测试各接口的调用方式
 */

const API_KEY = 'JZL34425f12232a7000';
const BASE_URL = 'https://www.dajiala.com';

// 测试账号：徐老师AI
const TEST_USER = {
  nickname: '徐老师AI',
  sec_uid: 'MS4wLjABAAAAJNts8oZ5FOMjrt5nXGQVcw47VcJvq29Pnvn9kjcODs0pkWQPLwz1CyNULDlvnlHK',
  url: 'https://www.douyin.com/user/MS4wLjABAAAAJNts8oZ5FOMjrt5nXGQVcw47VcJvq29Pnvn9kjcODs0pkWQPLwz1CyNULDlvnlHK'
};

async function testAuthMethods() {
  console.log('🔍 测试极致了API认证方式...\n');
  
  const authMethods = [
    {
      name: 'Bearer Token in Header',
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      body: { url: 'https://www.douyin.com/video/7540087196963966242' }
    },
    {
      name: 'X-API-Key in Header',
      headers: { 'X-API-Key': API_KEY },
      body: { url: 'https://www.douyin.com/video/7540087196963966242' }
    },
    {
      name: 'Token in Body',
      headers: {},
      body: { token: API_KEY, url: 'https://www.douyin.com/video/7540087196963966242' }
    },
    {
      name: 'API Key in Body',
      headers: {},
      body: { api_key: API_KEY, url: 'https://www.douyin.com/video/7540087196963966242' }
    },
    {
      name: 'Key in Body',
      headers: {},
      body: { key: API_KEY, url: 'https://www.douyin.com/video/7540087196963966242' }
    }
  ];
  
  for (const method of authMethods) {
    console.log(`\n测试: ${method.name}`);
    try {
      const response = await fetch(`${BASE_URL}/fbmain/monitor/v3/douyin_aweme_detail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...method.headers
        },
        body: JSON.stringify(method.body)
      });
      
      const data = await response.json();
      console.log('  返回:', JSON.stringify(data).slice(0, 100));
      
      if (data.code === 0) {
        console.log('  ✅ 成功！');
        return method;
      }
    } catch (err) {
      console.log('  ❌ 错误:', err.message);
    }
  }
  
  return null;
}

async function testUserPost() {
  console.log('\n\n📱 测试获取用户主页...');
  console.log(`用户: ${TEST_USER.nickname}`);
  console.log(`sec_uid: ${TEST_USER.sec_uid}`);
  
  const endpoints = [
    '/fbmain/monitor/v3/douyin_user_post',
    '/fbmain/monitor/v3/douyin_user_data'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n  测试端点: ${endpoint}`);
    
    const bodyVariations = [
      { sec_uid: TEST_USER.sec_uid, page: 1, page_size: 5 },
      { sec_uid: TEST_USER.sec_uid },
      { uid: TEST_USER.sec_uid },
      { user_id: TEST_USER.sec_uid },
      { url: TEST_USER.url }
    ];
    
    for (const body of bodyVariations) {
      try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (data.code === 0) {
          console.log('    ✅ 成功！参数:', Object.keys(body).join(','));
          console.log('    数据:', JSON.stringify(data).slice(0, 200));
          return { endpoint, body };
        } else {
          console.log('    ❌ 失败:', data.message || data.msg);
        }
      } catch (err) {
        console.log('    ❌ 错误:', err.message);
      }
    }
  }
  
  return null;
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('   极致了API 调试工具');
  console.log('═══════════════════════════════════════════');
  
  // 测试认证方式
  const workingAuth = await testAuthMethods();
  
  if (workingAuth) {
    console.log('\n✅ 找到可用认证方式:', workingAuth.name);
  } else {
    console.log('\n⚠️ 所有认证方式都失败了');
    console.log('可能原因:');
    console.log('  1. API Key可能需要特定的调用方式');
    console.log('  2. 可能需要在请求中包含签名参数');
    console.log('  3. 可能需要通过他们的SDK或代理服务调用');
    console.log('  4. 可能需要联系技术支持获取正确的调用方式');
  }
  
  // 测试用户主页
  await testUserPost();
  
  console.log('\n═══════════════════════════════════════════');
  console.log('测试完成');
  console.log('═══════════════════════════════════════════');
}

main().catch(console.error);
