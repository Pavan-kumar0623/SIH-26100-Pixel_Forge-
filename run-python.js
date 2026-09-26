const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const backendDir = path.join(__dirname, 'backend');
const python = path.join(backendDir, '.venv', isWin ? 'Scripts' : 'bin', isWin ? 'python.exe' : 'python');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node run-python.js <python args...>');
  process.exit(1);
}

const child = spawn(python, args, {
  cwd: backendDir,
  stdio: 'inherit',
  windowsHide: true,
});

child.on('exit', (code) => process.exit(code == null ? 1 : code));
child.on('error', (err) => {
  console.error(`Failed to start ${python}: ${err.message}`);
  console.error('Create the venv first: python -m venv backend/.venv && backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt');
  process.exit(1);
});
