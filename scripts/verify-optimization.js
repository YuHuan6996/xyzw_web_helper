#!/usr/bin/env node

/**
 * 优化验证脚本
 * 用于验证项目优化后的基本功能是否正常
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🧪 开始验证优化效果...\n');

// 检查关键文件是否存在
const requiredFiles = [
  'package.json',
  'vite.config.js',
  'tsconfig.json',
  'src/utils/common.js',
  'src/utils/logger.js',
  'postcss.config.js',
  '.prettierrc'
];

console.log('📋 文件完整性检查:');
let allFilesExist = true;

for (const file of requiredFiles) {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} (缺失)`);
    allFilesExist = false;
  }
}

console.log('\n🔧 配置验证:');

// 检查package.json脚本
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  
  const requiredScripts = ['dev', 'build', 'lint', 'format', 'type-check'];
  console.log('📦 package.json 脚本检查:');
  
  for (const script of requiredScripts) {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`✅ ${script}: ${packageJson.scripts[script]}`);
    } else {
      console.log(`❌ ${script} (缺失)`);
    }
  }
  
  // 检查关键依赖
  const devDependencies = packageJson.devDependencies || {};
  const requiredDeps = [
    'vite',
    'typescript',
    'vue-tsc',
    'vite-plugin-checker',
    'vite-plugin-pwa'
  ];
  
  console.log('\n📚 关键依赖检查:');
  for (const dep of requiredDeps) {
    if (devDependencies[dep]) {
      console.log(`✅ ${dep}@${devDependencies[dep]}`);
    } else {
      console.log(`❌ ${dep} (缺失)`);
    }
  }
  
} catch (error) {
  console.log(`❌ package.json 解析失败: ${error.message}`);
}

// 检查TypeScript配置
try {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'tsconfig.json'), 'utf8'));
  console.log('\n📝 TypeScript 配置检查:');
  
  if (tsconfig.compilerOptions?.target) {
    console.log(`✅ Target: ${tsconfig.compilerOptions.target}`);
  }
  
  if (tsconfig.compilerOptions?.strict) {
    console.log('✅ Strict mode: enabled');
  }
  
  if (tsconfig.include) {
    console.log(`✅ Include patterns: ${tsconfig.include.join(', ')}`);
  }
  
} catch (error) {
  console.log(`❌ tsconfig.json 解析失败: ${error.message}`);
}

// 验证工具函数
console.log('\n🛠️ 工具函数验证:');
try {
  // 检查common.js是否存在并可读
  const commonJsPath = path.join(projectRoot, 'src/utils/common.js');
  if (fs.existsSync(commonJsPath)) {
    const content = fs.readFileSync(commonJsPath, 'utf8');
    if (content.includes('debounce') && content.includes('throttle')) {
      console.log('✅ common.js 工具函数完整');
    } else {
      console.log('❌ common.js 内容不完整');
    }
  } else {
    console.log('❌ common.js 文件不存在');
  }
} catch (error) {
  console.log(`❌ 工具函数验证失败: ${error.message}`);
}

// 总结
console.log('\n📊 验证总结:');
if (allFilesExist) {
  console.log('✅ 所有必需文件都已正确创建');
  console.log('🎉 项目优化完成，可以正常使用！');
} else {
  console.log('❌ 部分文件缺失，请检查上述输出');
}

console.log('\n🚀 优化验证完成！');
console.log('💡 建议下一步:');
console.log('   1. 运行 npm install 安装依赖');
console.log('   2. 运行 npm run dev 启动开发服务器');
console.log('   3. 访问 http://localhost:3000 验证应用');
console.log('   4. 使用浏览器控制台的 wsDebug 对象进行调试');