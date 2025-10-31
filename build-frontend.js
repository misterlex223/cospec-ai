const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Run the build command from the app-react directory
const sourceDir = path.join(__dirname, 'app-react');
const nodeModulesDir = path.join(sourceDir, 'node_modules');

try {
  // Only install dependencies if node_modules doesn't exist
  if (!fs.existsSync(nodeModulesDir)) {
    console.log('Installing frontend dependencies...');
    execSync('npm install --ignore-scripts', {
      cwd: sourceDir,
      stdio: 'inherit',
      env: process.env
    });
  } else {
    console.log('Frontend dependencies already installed, skipping...');
  }

  console.log('Building frontend...');
  // Then run the build
  const buildResult = execSync('npm run build', { 
    cwd: sourceDir,
    stdio: 'inherit',
    env: process.env
  });
  
  // After successful build, copy the dist folder to the root
  const sourceDistDir = path.join(__dirname, 'app-react', 'dist');
  const targetDir = path.join(__dirname, 'dist');
  
  // Remove the old dist directory if it exists
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  
  // Check if source dist directory exists before copying
  if (fs.existsSync(sourceDistDir)) {
    // Copy the new build
    fs.cpSync(sourceDistDir, targetDir, { recursive: true });
    console.log('Frontend build completed and copied to root dist directory');
  } else {
    console.error('Error: Build output directory does not exist:', sourceDistDir);
    process.exit(1);
  }
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}