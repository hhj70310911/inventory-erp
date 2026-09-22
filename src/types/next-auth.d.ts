import type { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface User {
    credentialStamp?: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    credentialStamp?: string;
    id: string;
    role: Role;
  }
}
