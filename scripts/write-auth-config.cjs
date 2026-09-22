const fs = require('fs');
const path = require('path');
const base = 'D:/korean proxy shopping';

function write(rel, lines) {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, lines.join('\n') + '\n', 'utf8');
  console.log('wrote:', rel);
}

// Auth config (Edge-safe, no Prisma/bcrypt)
write('src/auth.config.ts', [
  'import type { NextAuthConfig } from "next-auth";',
  'import type { Role } from "@prisma/client";',
  '',
  '// Edge bundle only - no Prisma/bcrypt/providers.',
  '// jwt + session callbacks live here so Edge middleware can read role.',
  'export const authConfig = {',
  '  providers: [],',
  '  trustHost: true,',
  '  secret: process.env.AUTH_SECRET,',
  '  pages: { signIn: "/login" },',
  '  callbacks: {',
  '    authorized({ auth, request }) {',
  '      const p = request.nextUrl.pathname;',
  '      if (p.startsWith("/admin")) {',
  '        return auth?.user?.role === "ADMIN";',
  '      }',
  '      return true;',
  '    },',
  '    jwt({ token, user }) {',
  '      if (user) {',
  '        if (user.id)    token.id    = user.id;',
  '        if (user.email) token.email = user.email;',
  '        if (user.role)  token.role  = user.role;',
  '      }',
  '      return token;',
  '    },',
  '    session({ session, token }) {',
  '      if (session.user) {',
  '        session.user.id    = (token.id    as unknown as string) ?? "";',
  '        session.user.email = (token.email as unknown as string) ?? "";',
  '        session.user.role  = (token.role  as unknown as Role);',
  '      }',
  '      return session;',
  '    },',
  '  },',
  '} satisfies NextAuthConfig;',
  '',
]);

console.log('Written as UTF-8 OK');
