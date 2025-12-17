import { existsSync, readFileSync } from 'fs';
import { join, basename } from 'path';

/**
 * Try to read the project name from package.json.
 * @param dir - Directory to search in
 * @returns The name field value or null if not found
 */
function getPackageJsonName(dir: string): string | null {
  const packagePath = join(dir, 'package.json');
  if (!existsSync(packagePath)) {
    return null;
  }

  try {
    const content = readFileSync(packagePath, 'utf-8');
    const pkg = JSON.parse(content);
    if (typeof pkg.name === 'string' && pkg.name.trim()) {
      return pkg.name.trim();
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Try to read the project name from pyproject.toml.
 * Looks for [project] section with name = "..." pattern.
 * @param dir - Directory to search in
 * @returns The name value or null if not found
 */
function getPyprojectName(dir: string): string | null {
  const pyprojectPath = join(dir, 'pyproject.toml');
  if (!existsSync(pyprojectPath)) {
    return null;
  }

  try {
    const content = readFileSync(pyprojectPath, 'utf-8');

    // Simple regex to find name in [project] section
    // Match [project] section and then find name = "..." or name = '...'
    const projectSectionMatch = content.match(/\[project\]([\s\S]*?)(?=\n\[|$)/);
    if (projectSectionMatch && projectSectionMatch[1]) {
      const projectSection = projectSectionMatch[1];
      const nameMatch = projectSection.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
      if (nameMatch && nameMatch[1] && nameMatch[1].trim()) {
        return nameMatch[1].trim();
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Detect project name from common project files.
 * Priority:
 * 1. package.json "name" field
 * 2. pyproject.toml [project] name
 * 3. Fallback to directory basename
 *
 * @param dir - Directory to search in (defaults to cwd)
 * @returns Detected project name
 */
export function detectProjectName(dir: string = process.cwd()): string {
  // Try package.json first
  const packageJsonName = getPackageJsonName(dir);
  if (packageJsonName) {
    return packageJsonName;
  }

  // Try pyproject.toml next
  const pyprojectName = getPyprojectName(dir);
  if (pyprojectName) {
    return pyprojectName;
  }

  // Fallback to directory basename
  return basename(dir);
}
