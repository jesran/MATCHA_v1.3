const { execSync, spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const rootDir = __dirname;
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");
const backendEnvPath = path.join(backendDir, ".env");
const backendEnvExamplePath = path.join(backendDir, ".env.example");

function log(message) {
  console.log(message);
}

function logError(message) {
  console.error(message);
}

function exitWithError(message, error) {
  logError(`\nError: ${message}`);

  if (error) {
    const stderr = typeof error.stderr === "string" ? error.stderr.trim() : "";
    const stdout = typeof error.stdout === "string" ? error.stdout.trim() : "";
    const details = stderr || stdout || error.message;

    if (details) {
      logError(details);
    }
  }

  process.exit(1);
}

function runCommand(command, options = {}) {
  try {
    execSync(command, {
      stdio: "inherit",
      ...options,
    });
  } catch (error) {
    throw error;
  }
}

function commandWorks(command) {
  try {
    execSync(command, { stdio: "pipe" });
    return true;
  } catch (_) {
    return false;
  }
}

function resolvePythonCommand() {
  if (commandWorks("python --version")) {
    return "python";
  }

  if (commandWorks("python3 --version")) {
    return "python3";
  }

  exitWithError(
    "Python is not installed or is not available in PATH. Install Python and try again."
  );
}

function ensureCommand(command, checkCommand, installMessage) {
  if (!commandWorks(checkCommand)) {
    exitWithError(installMessage);
  }

  return command;
}

function ensureProjectStructure() {
  if (!fs.existsSync(backendDir)) {
    exitWithError(`Backend directory not found at: ${backendDir}`);
  }

  if (!fs.existsSync(frontendDir)) {
    exitWithError(`Frontend directory not found at: ${frontendDir}`);
  }

  const requirementsPath = path.join(backendDir, "requirements.txt");
  if (!fs.existsSync(requirementsPath)) {
    exitWithError(`Backend requirements file not found at: ${requirementsPath}`);
  }

  const packageJsonPath = path.join(frontendDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    exitWithError(`Frontend package.json not found at: ${packageJsonPath}`);
  }
}

function ensureBackendEnvFile() {
  if (fs.existsSync(backendEnvPath)) {
    return;
  }

  if (!fs.existsSync(backendEnvExamplePath)) {
    log("\nbackend/.env is missing and backend/.env.example was not found.");
    log("Skipping automatic environment file creation.");
    return;
  }

  fs.copyFileSync(backendEnvExamplePath, backendEnvPath);
  log("\nCreated backend/.env from backend/.env.example.");
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

function getOllamaInstallHint() {
  if (process.platform === "darwin") {
    return "Install Ollama with Homebrew: brew install --cask ollama";
  }

  if (process.platform === "win32") {
    return "Install Ollama from https://ollama.com/download or use winget install Ollama.Ollama";
  }

  return "Install Ollama from https://ollama.com/download or run: curl -fsSL https://ollama.com/install.sh | sh";
}

function isModelAvailable(modelName) {
  try {
    const output = execSync("ollama list", { encoding: "utf8", stdio: "pipe" });
    return output.includes(modelName);
  } catch (_) {
    return false;
  }
}

function isOllamaServiceReachable(baseUrl) {
  return new Promise((resolve) => {
    try {
      const url = new URL(baseUrl);
      const healthUrl = new URL("/api/tags", `${url.protocol}//${url.host}`);

      const request = http.get(
        healthUrl,
        {
          timeout: 2500,
        },
        (response) => {
          response.resume();
          resolve(response.statusCode >= 200 && response.statusCode < 500);
        }
      );

      request.on("timeout", () => {
        request.destroy();
        resolve(false);
      });

      request.on("error", () => {
        resolve(false);
      });
    } catch (_) {
      resolve(false);
    }
  });
}

async function ensureOllamaSetup() {
  const env = parseEnvFile(backendEnvPath);
  const ollamaUrl = env.OLLAMA_URL || "http://localhost:11434/api/generate";
  const ollamaModel = env.OLLAMA_MODEL || "mistral:7b";

  log("\nChecking local LLM setup...");
  log(`Configured Ollama URL: ${ollamaUrl}`);
  log(`Configured Ollama model: ${ollamaModel}`);

  if (!commandWorks("ollama --version")) {
    log("\nOllama is not installed.");
    log(getOllamaInstallHint());
    log(`After installing, run: ollama pull ${ollamaModel}`);
    log("The app will still start, but AI idea evaluation will not work until Ollama is ready.");
    return;
  }

  log("Ollama is installed.");

  const ollamaReachable = await isOllamaServiceReachable(ollamaUrl);
  if (!ollamaReachable) {
    log("\nOllama is installed, but the local service is not responding yet.");
    if (process.platform === "darwin") {
      log("Open the Ollama app, wait for it to finish starting, then rerun setup if idea evaluation does not work.");
    } else if (process.platform === "win32") {
      log("Start the Ollama app or service, then rerun setup if idea evaluation does not work.");
    } else {
      log("Start Ollama with `ollama serve`, then rerun setup if idea evaluation does not work.");
    }
    log(`Once the service is running, setup can download ${ollamaModel} automatically if needed.`);
    log("The app will still start without the LLM service, but AI idea evaluation will be unavailable.");
    return;
  }

  log("Ollama service is reachable.");

  if (!isModelAvailable(ollamaModel)) {
    log(`\nModel ${ollamaModel} is not available locally yet.`);
    log(`Pulling ${ollamaModel} with Ollama...`);

    try {
      runCommand(`ollama pull ${ollamaModel}`);
      log(`Model ${ollamaModel} is ready.`);
    } catch (error) {
      logError(`\nFailed to pull ${ollamaModel}.`);
      const details = typeof error.stderr === "string" ? error.stderr.trim() : "";
      if (details) {
        logError(details);
      }
      log("The app will still start, but AI idea evaluation may not work until the model is downloaded.");
      return;
    }
  } else {
    log(`Model ${ollamaModel} is already available.`);
  }
}

function installBackendDependencies(pythonCommand) {
  log("\nInstalling backend dependencies...");

  try {
    runCommand(`${pythonCommand} -m pip install -r requirements.txt`, {
      cwd: backendDir,
    });
  } catch (error) {
    exitWithError(
      "Failed to install backend dependencies from backend/requirements.txt.",
      error
    );
  }
}

function runBackendMigrations(pythonCommand) {
  const managePyPath = path.join(backendDir, "manage.py");
  if (!fs.existsSync(managePyPath)) {
    return;
  }

  log("\nApplying backend migrations...");

  try {
    runCommand(`${pythonCommand} manage.py migrate`, {
      cwd: backendDir,
    });
  } catch (error) {
    exitWithError("Failed to apply Django migrations.", error);
  }
}

function installFrontendDependencies() {
  log("\nInstalling frontend dependencies...");

  try {
    runCommand("npm install", {
      cwd: frontendDir,
    });
  } catch (error) {
    exitWithError("Failed to install frontend dependencies with npm.", error);
  }
}

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function getFrontendLaunchConfig() {
  const viteCliPath = path.join(frontendDir, "node_modules", "vite", "bin", "vite.js");

  if (fs.existsSync(viteCliPath)) {
    return {
      command: process.execPath,
      args: [viteCliPath],
      description: "node node_modules/vite/bin/vite.js",
    };
  }

  return {
    command: getNpmCommand(),
    args: ["run", "dev"],
    description: "npm run dev",
  };
}

function getBackendLaunchConfig(pythonCommand) {
  const appPyPath = path.join(backendDir, "app.py");
  const managePyPath = path.join(backendDir, "manage.py");

  if (fs.existsSync(appPyPath)) {
    return {
      command: pythonCommand,
      args: ["app.py"],
      description: "backend/app.py",
    };
  }

  if (fs.existsSync(managePyPath)) {
    return {
      command: pythonCommand,
      args: ["manage.py", "runserver", "8001"],
      description: "backend/manage.py runserver 8001",
    };
  }

  exitWithError(
    "No backend entrypoint found. Expected backend/app.py or backend/manage.py."
  );
}

function spawnProcess(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
  });

  child.on("error", (error) => {
    exitWithError(`Failed to start ${name}.`, error);
  });

  child.on("exit", (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    if (signal) {
      logError(`\n${name} stopped with signal ${signal}. Shutting down all processes...`);
    } else if (code !== 0) {
      logError(`\n${name} exited with code ${code}. Shutting down all processes...`);
    } else {
      log(`\n${name} exited normally. Shutting down all processes...`);
    }

    shutdown(code && code !== 0 ? code : 0);
  });

  return child;
}

function openBrowser(url) {
  const openers = {
    win32: { command: "cmd", args: ["/c", "start", "", url] },
    darwin: { command: "open", args: [url] },
    linux: { command: "xdg-open", args: [url] },
  };

  const opener = openers[process.platform];
  if (!opener) {
    return;
  }

  const browserProcess = spawn(opener.command, opener.args, {
    stdio: "ignore",
    detached: true,
    shell: false,
  });

  browserProcess.on("error", () => {
    logError(`Could not open browser automatically. Visit ${url} manually.`);
  });

  browserProcess.unref();
}

const children = [];
let isShuttingDown = false;

function terminateChild(child) {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      shell: false,
    });
    return;
  }

  child.kill("SIGTERM");
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const child of children) {
    terminateChild(child);
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 300);
}

async function main() {
  log("Checking dependencies...");
  ensureProjectStructure();
  ensureBackendEnvFile();

  const pythonCommand = resolvePythonCommand();
  ensureCommand(
    "node",
    "node -v",
    "Node.js is not installed or is not available in PATH. Install Node.js and try again."
  );
  ensureCommand(
    "npm",
    "npm -v",
    "npm is not installed or is not available in PATH. Install npm and try again."
  );

  installBackendDependencies(pythonCommand);
  runBackendMigrations(pythonCommand);
  installFrontendDependencies();
  await ensureOllamaSetup();

  const backendLaunch = getBackendLaunchConfig(pythonCommand);
  const frontendLaunch = getFrontendLaunchConfig();

  log("\nStarting servers...");
  log(`Backend: ${backendLaunch.description}`);
  log(`Frontend: ${frontendLaunch.description}`);

  const backendProcess = spawnProcess(
    "Backend server",
    backendLaunch.command,
    backendLaunch.args,
    backendDir
  );
  children.push(backendProcess);

  const frontendProcess = spawnProcess(
    "Frontend server",
    frontendLaunch.command,
    frontendLaunch.args,
    frontendDir
  );
  children.push(frontendProcess);

  setTimeout(() => {
    openBrowser("http://localhost:5173");
  }, 4000);

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  log("\nServers are starting. Press Ctrl+C to stop both.");
}

main().catch((error) => {
  exitWithError("Setup failed unexpectedly.", error);
});
