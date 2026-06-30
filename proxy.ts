// Next.js 16: o antigo "middleware" agora se chama Proxy (proxy.ts na raiz).
// Responsável por: (1) refresh da sessão Supabase a cada request e
// (2) roteamento otimista por perfil (lendo o role do JWT, sem tocar no banco).
// A segurança real dos dados é garantida pelo RLS no Postgres + checagens na DAL.
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { ROLE_AREA, ROLE_HOME, type Role } from "@/lib/types";

const PUBLIC_PATHS = ["/login", "/auth"];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Não autenticado: só pode acessar rotas públicas.
  if (!user) {
    if (isPublic(path)) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  const role = user.app_metadata?.role as Role | undefined;
  const home = role ? ROLE_HOME[role] : "/login";

  // Autenticado visitando login ou raiz: manda para a home do perfil.
  if (path === "/" || path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Proteção de área: cada perfil só acessa o próprio prefixo.
  if (role) {
    const allowed = ROLE_AREA[role];
    const inSomeArea = Object.values(ROLE_AREA).some((pre) =>
      path.startsWith(pre),
    );
    if (inSomeArea && !path.startsWith(allowed)) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Roda em tudo, exceto assets estáticos e /api (as rotas de API tratam auth
  // internamente e devem responder JSON, nunca redirect).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webmanifest)$).*)",
  ],
};
