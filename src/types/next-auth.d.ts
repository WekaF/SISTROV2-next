import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id:             string;
      role:           string;
      roles:          string[];
      companyCode?:   string | null;
      aspnetToken?:   string | null;
      username?:      string | null;
      transportCode?: string | null;
    } & DefaultSession["user"]
  }

  interface User {
    id:             string;
    role:           string;
    roles:          string[];
    companyCode?:   string | null;
    aspnetToken?:   string | null;
    username?:      string | null;
    transportCode?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:             string;
    role:           string;
    roles:          string[];
    companyCode?:   string | null;
    aspnetToken?:   string | null;
    username?:      string | null;
    transportCode?: string | null;
  }
}
