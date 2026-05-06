import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Priority order: index 0 = highest privilege
const ROLE_PRIORITY = [
  // System / Admin
  "ti",
  "superadmin",
  "admin",
  "adminsumbu",
  // Candal (management roles)
  "candalkuota",
  "candaltruk",
  "candaltruck",
  "candalcontainer",
  "candalgudangposto",
  "candalgudang",
  "candaldept",
  "candalkapal",
  // POD / AdminArmada
  "adminarmada",
  // Operational core roles — ranked before staffarea so if a user has
  // both gudang/security AND staffarea, the operational role wins
  "security",
  "securitylini3",
  "timbangan",
  "gudang",
  "gudanglini3",
  "chekerlini3",
  "checkerlini3",
  // StaffArea (kuota + posto management)
  "staffarea",
  "staffarewilayah1",
  "staffarewilayah2",
  "staffarealayah1",
  "staffarealayah2",
  "staffareajatim",
  // Viewer
  "viewer",
  "pkg",
  "viewerposto",
  "viewerarmada",
  // DataAreaBagian (area data scoping, supplementary)
  "dataareabagianpoall",
  "dataareabagiansoall",
  "dataareabagianpojateng",
  "dataareabagianpojatim",
  "dataareabagianpopelabuhan",
  "dataareabagianposulsel",
  "dataareabagianposumbagsel",
  "dataareabagianposumbagut",
  "dataareabagian",
  // Transport / Rekanan
  "transport",
  "transportsuraljalan",
  "rekanan",
  // Terminal / Pelabuhan
  "terminal1",
  "terminal2",
  "pelabuhanapp",
  "pelabuhanuppp",
  // Others
  "tracknTrace",
  "accessindigo",
  "app",
];

function pickHighestRole(roles: string[]): string {
  if (roles.length === 0) return "viewer";
  let best = roles[0];
  let bestPriority = ROLE_PRIORITY.indexOf(best);
  if (bestPriority === -1) bestPriority = ROLE_PRIORITY.length;
  for (const r of roles) {
    const p = ROLE_PRIORITY.indexOf(r);
    const effectivePriority = p === -1 ? ROLE_PRIORITY.length : p;
    if (effectivePriority < bestPriority) {
      best = r;
      bestPriority = effectivePriority;
    }
  }
  return best;
}

const ASPNET_API_URL = process.env.ASPNET_API_URL || "http://192.168.188.170:8090";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username:    { label: "Username", type: "text" },
        password:    { label: "Password", type: "password" },
        companycode: { label: "Company Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username dan password wajib diisi");
        }

        const params = new URLSearchParams({
          grant_type: "password",
          username:   credentials.username,
          password:   credentials.password,
        });
        if (credentials.companycode) {
          params.append("companycode", credentials.companycode);
        }

        let data: any;
        try {
          const res = await fetch(`${ASPNET_API_URL}/Token`, {
            method:  "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body:    params.toString(),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => res.statusText);
            let errMsg = "Login gagal";
            try { errMsg = JSON.parse(text)?.error_description || text || errMsg; } catch {}
            throw new Error(errMsg);
          }
          data = await res.json();
        } catch (err: any) {
          throw new Error(err?.message || "Tidak dapat terhubung ke server");
        }

        const roles: string[] = data.role
          ? data.role.split(", ").map((r: string) => r.trim().toLowerCase())
          : [];

        return {
          id:            data.userid,
          name:          data.fullname,
          email:         data.email,
          role:          pickHighestRole(roles),
          roles,
          companyCode:   data.companycode ?? null,
          aspnetToken:   data.access_token,
          username:      data.username,
          transportCode: data.transportcode ?? null,
          // Store encoded password for company-switch re-auth
          // Safe: JWT is encrypted by NEXTAUTH_SECRET server-side
          _pw: Buffer.from(credentials.password).toString("base64"),
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user, trigger, session: updateData }) {
      // Initial sign-in
      if (user) {
        token.role          = (user as any).role;
        token.roles         = (user as any).roles;
        token.id            = (user as any).id;
        token.companyCode   = (user as any).companyCode;
        token.aspnetToken   = (user as any).aspnetToken;
        token.username      = (user as any).username;
        token.transportCode = (user as any).transportCode;
        token._pw           = (user as any)._pw; // encoded password for switch
      }
      // Called from useSession().update() after company switch
      if (trigger === "update" && updateData) {
        if (updateData.aspnetToken) token.aspnetToken = updateData.aspnetToken;
        if (updateData.companyCode) token.companyCode = updateData.companyCode;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).role          = token.role;
        (session.user as any).roles         = token.roles;
        (session.user as any).id            = token.id;
        (session.user as any).companyCode   = token.companyCode;
        (session.user as any).aspnetToken   = token.aspnetToken;
        (session.user as any).username      = token.username;
        (session.user as any).transportCode = token.transportCode;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
