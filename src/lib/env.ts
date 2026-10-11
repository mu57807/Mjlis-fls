/**
 * Read a secret from the environment, forgiving common copy-paste slips:
 * spaces or line breaks around it, surrounding quotes, or the whole
 * "NAME=value" line pasted as the value.
 */
export function envKey(name: string): string | undefined {
  let v = process.env[name];
  if (!v) return undefined;
  v = v.trim();
  if (v.startsWith(`${name}=`)) v = v.slice(name.length + 1).trim();
  v = v.replace(/^["'`]([^]*)["'`]$/, "$1").trim();
  v = v.replace(/\s+/g, "");
  return v || undefined;
}
