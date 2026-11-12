import { accessSync, constants, statSync } from "node:fs";
import { delimiter, extname, isAbsolute, join } from "node:path";
import { spawnSync, type ChildProcess } from "node:child_process";

/** Resolve a program without starting a shell, including Windows PATHEXT. */
export function findExecutable(command: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const windows = process.platform === "win32";
  const pathKey = Object.keys(env).find(k => k.toLowerCase() === "path");
  const dirs = isAbsolute(command) || /[\\/]/.test(command) ? [""] : (env[pathKey ?? "PATH"] ?? "").split(delimiter).filter(Boolean);
  const extensions = windows && !extname(command) ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";") : [""];
  for (const dir of dirs) for (const extension of extensions) {
    const file = dir ? join(dir.replace(/^"|"$/g, ""), command + extension) : command + extension;
    try {
      if (!statSync(file).isFile()) continue;
      accessSync(file, windows ? constants.F_OK : constants.X_OK);
      return file;
    } catch { /* Try the next PATH entry. */ }
  }
  return undefined;
}

/** Explicit user shell commands use the native shell; agent tools choose their own. */
export function shellCommand(command: string, env: NodeJS.ProcessEnv = process.env): [string, string[]] {
  if (process.platform === "win32") return ["powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command]];
  const shell = env.SHELL;
  return [shell && /\/(?:ba|z|k|da)?sh$/.test(shell) ? shell : "/bin/bash", ["-c", command]];
}

export function killProcessTree(proc: ChildProcess, signal: NodeJS.Signals): void {
  if (!proc.pid) return;
  if (process.platform === "win32") {
    if (proc.exitCode !== null || proc.signalCode !== null) return;
    // Negative process-group IDs are POSIX-only. taskkill terminates descendants too.
    spawnSync("taskkill.exe", ["/PID", String(proc.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
  } else {
    try { process.kill(-proc.pid, signal); } catch { /* Already gone. */ }
  }
}

/** Windows npm shims have a cmd.exe parent; stop their children as well. */
export function stopProcess(proc: ChildProcess, signal: NodeJS.Signals = "SIGTERM"): void {
  if (process.platform === "win32") killProcessTree(proc, signal);
  else proc.kill(signal);
}
