import { credentialStamp, matchesCredential } from '@/lib/erp/credential-session';
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });
        if (!user?.passwordHash || !user.active || (user.role !== "ADMIN" && !user.employeeRole)) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role as Role,
          credentialStamp: credentialStamp(user.passwordHash),
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.credentialStamp = user.credentialStamp;
      }
      if (typeof token.id!=="string"||!token.id) return null;
      const current=await prisma.user.findUnique({where:{id:token.id},select:{passwordHash:true,active:true,role:true,employeeRole:true,email:true}});
      if(!current?.active||(current.role!=="ADMIN"&&!current.employeeRole)||!matchesCredential(token.credentialStamp,current.passwordHash))return null;
      token.role=current.role;
      token.email=current.email;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
