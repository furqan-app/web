// fq-commands OpenCode plugin
// Exposes every skill in .claude/skills/ and .agents/skills/ as a slash command,
// so /plan-fq-task etc. work in OpenCode without maintaining .opencode/commands/*.md
// wrappers per skill. New skills are picked up automatically on restart.
//
// Reads SKILL.md frontmatter (name + description) and uses the body as the
// command template, appending the user's $ARGUMENTS when the body does not
// already reference it (e.g. /release minor).
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function parseSkillFile(content, fallbackName) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  const [, frontmatter, body] = match;

  const nameMatch = frontmatter.match(/^\s*name:\s*(.+?)\s*$/m);
  const name = (nameMatch ? nameMatch[1].trim() : fallbackName).replace(/^["']|["']$/g, "");

  // description may be folded (description: >- followed by indented lines)
  let description = "";
  const descMatch = frontmatter.match(/^\s*description:\s*(.*)$/m);
  if (descMatch) {
    const first = descMatch[1].trim();
    if (first === ">" || first === ">-" || first === "|" || first === "|-") {
      const lines = frontmatter.split(/\r?\n/);
      const idx = lines.findIndex((l) => /^\s*description:/.test(l));
      const folded = [];
      for (let i = idx + 1; i < lines.length; i++) {
        if (/^\s+\S/.test(lines[i])) folded.push(lines[i].trim());
        else break;
      }
      description = folded.join(" ");
    } else {
      description = first.replace(/^["']|["']$/g, "");
    }
  }

  return { name, description, body: body.trim() };
}

function collectSkills(directory) {
  const found = new Map(); // name -> { description, template }
  const roots = [join(directory, ".claude", "skills"), join(directory, ".agents", "skills")];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const file = join(root, entry.name, "SKILL.md");
      if (!existsSync(file)) continue; // e.g. scripts/
      let parsed;
      try {
        parsed = parseSkillFile(readFileSync(file, "utf8"), entry.name);
      } catch {
        continue;
      }
      if (!parsed || !NAME_RE.test(parsed.name)) continue;
      if (!parsed.description || !parsed.body) continue;
      if (found.has(parsed.name)) continue; // .claude wins over .agents
      const template = parsed.body.includes("$ARGUMENTS")
        ? parsed.body
        : `${parsed.body}\n\nUser arguments: $ARGUMENTS\n`;
      found.set(parsed.name, { description: parsed.description, template });
    }
  }
  return found;
}

export const FqCommandsPlugin = async ({ directory }) => {
  return {
    config: (cfg) => {
      cfg.command = cfg.command ?? {};
      for (const [name, def] of collectSkills(directory)) {
        if (cfg.command[name]) continue; // explicit config wins
        cfg.command[name] = def;
      }
    },
  };
};
