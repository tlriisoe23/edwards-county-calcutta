import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
const root = resolve('.'), target = resolve('.sites-runtime/portable-build');
mkdirSync(target, { recursive: true });
for (const name of ['app', 'lib', 'components', 'hooks', 'public', 'drizzle', 'portable', 'vendor', 'types']) {
  const destination = resolve(target, name);
  if (!destination.startsWith(target + (process.platform === 'win32' ? '\\' : '/'))) throw Error('Invalid staging destination.');
  rmSync(destination, { recursive: true, force: true });
  cpSync(join(root, name), join(target, name), { recursive: true });
}
for (const name of ['package.json', 'package-lock.json', 'postcss.config.mjs']) cpSync(join(root, name), join(target, name));
const ts = JSON.parse(readFileSync('tsconfig.json', 'utf8'));
ts.exclude = ['node_modules']; ts.compilerOptions.incremental = false;
writeFileSync(join(target, 'tsconfig.json'), JSON.stringify(ts, null, 2));
writeFileSync(join(target, 'next.config.mjs'), 'import { fileURLToPath } from "node:url";\nexport default { output: "standalone", outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)), serverExternalPackages: ["openid-client"], experimental: { cpus: 2 } };\n');
if (!existsSync(join(target, 'node_modules'))) symlinkSync(join(root, 'node_modules'), join(target, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
const store = readFileSync(join(target, 'lib/store.ts'), 'utf8').replace('from "cloudflare:workers"', 'from "@/portable/runtime.mjs"').replace('return env.DB;', 'return env.DB as unknown as D1Database;');
writeFileSync(join(target, 'lib/store.ts'), store);
writeFileSync(join(target, 'app/chatgpt-auth.ts'), 'export * from "@/portable/chatgpt-auth";\n');
for (const name of ['signin-with-chatgpt', 'signout-with-chatgpt', 'api/auth/[action]']) {
  const dir = join(target, 'app', name); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'route.ts'), 'export const dynamic = "force-dynamic";\nexport { GET, POST } from "@/portable/auth-handler.mjs";\n');
}
for (const name of ['auction.tsx', 'operator.tsx']) {
  const path = join(target, 'app', name);
  writeFileSync(path, readFileSync(path, 'utf8').replaceAll('ChatGPT', 'Google').replace('The owner allowlist is protected in Sites settings.', 'Owners are configured for this installation.'));
}
const admin = join(target, 'app/admin/page.tsx');
writeFileSync(admin, readFileSync(admin, 'utf8').replace('Your ChatGPT account', 'Your account'));
const adminApi = join(target, 'app/api/admin/route.ts');
const adminApiSource = readFileSync(adminApi, 'utf8')
  .replace('new URL(request.url).origin', 'publicOrigin()')
  .replace(/\n\/\/ PORTABLE-STUB-START[\s\S]*?\/\/ PORTABLE-STUB-END\n/, '\n');
writeFileSync(adminApi, 'import { publicOrigin, createLocalUser, listLocalUsers, setLocalUserEnabled, resetLocalUserPassword } from "@/portable/sessions.mjs";\n' + adminApiSource);
console.log('Portable build staged at ' + target);
