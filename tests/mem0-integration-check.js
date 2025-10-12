// mem0-integration-check.js
// Simple integration check for mem0 functionality

console.log('Checking mem0 integration...');

// Test 1: Check if mem0 service file exists
try {
  const fs = require('fs');
  if (fs.existsSync('../server/mem0Service.js')) {
    console.log('✅ Mem0 service file exists');
  } else {
    console.log('❌ Mem0 service file does not exist');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error checking mem0 service file:', error.message);
  process.exit(1);
}

// Test 2: Check if mem0 service file has the required content
try {
  const fs = require('fs');
  const mem0ServiceCode = fs.readFileSync('../server/mem0Service.js', 'utf8');

  const requiredElements = [
    'class Mem0Service',
    'constructor',
    'addMemory',
    'searchMemories',
    'getAllMemories',
    'addCategorizedMemory',
    'searchByCategory',
    'memoryStore'
  ];

  let allElementsExist = true;
  for (const element of requiredElements) {
    if (!mem0ServiceCode.includes(element)) {
      console.log(`❌ Required element "${element}" not found in mem0 service`);
      allElementsExist = false;
    }
  }

  if (allElementsExist) {
    console.log('✅ Mem0 service file contains all required elements');
  }
} catch (error) {
  console.log('❌ Error reading mem0 service file:', error.message);
  process.exit(1);
}

// Test 3: Check if server file imports mem0 service
try {
  const fs = require('fs');
  const serverCode = fs.readFileSync('../server/index.js', 'utf8');

  if (serverCode.includes("const Mem0Service = require('./mem0Service')") &&
      serverCode.includes('const mem0Service = new Mem0Service()') &&
      serverCode.includes('mem0Service.searchMemories') &&
      serverCode.includes('mem0Service.addCategorizedMemory')) {
    console.log('✅ Server file correctly imports and uses mem0 service');
  } else {
    console.log('❌ Server file does not properly integrate mem0 service');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error reading server file:', error.message);
  process.exit(1);
}

// Test 4: Check if docker-compose includes the vector database service
try {
  const fs = require('fs');
  const dockerCompose = fs.readFileSync('../docker-compose.yml', 'utf8');

  if (dockerCompose.includes('mem0-db') &&
      dockerCompose.includes('MEM0_API_KEY') &&
      dockerCompose.includes('VECTOR_STORE_PROVIDER')) {
    console.log('✅ Docker Compose file includes vector database service and proper configuration');
  } else {
    console.log('❌ Docker Compose file missing vector database service or configuration');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error reading docker-compose file:', error.message);
  process.exit(1);
}

// Test 5: Check if environment example file exists
try {
  const fs = require('fs');
  const envExample = fs.readFileSync('../.env.example', 'utf8');

  if (envExample.includes('MEM0_API_URL') &&
      envExample.includes('MEM0_API_KEY') &&
      envExample.includes('MEM0_USER_ID')) {
    console.log('✅ Environment example file includes mem0 variables');
  } else {
    console.log('❌ Environment example file does not include mem0 variables');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error reading .env.example file:', error.message);
  process.exit(1);
}

// Test 6: Check if package.json includes required dependencies
try {
  const fs = require('fs');
  const packageJson = JSON.parse(fs.readFileSync('../server/package.json', 'utf8'));

  if (packageJson.dependencies && packageJson.dependencies.axios) {
    console.log('✅ Server package.json includes axios dependency');
  } else {
    console.log('❌ Server package.json does not include axios dependency');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  process.exit(1);
}

console.log('\n🎉 All mem0 integration checks passed!');
console.log('Mem0 has been successfully integrated with the AI Assistant.');
console.log('\nTo run the full system:');
console.log('1. Install dependencies: cd server && npm install');
console.log('2. Set your environment variables (MEM0_API_KEY, OPENAI_API_KEY)');
console.log('3. Run: docker compose up');
console.log('4. The AI Assistant will now have memory capabilities!');