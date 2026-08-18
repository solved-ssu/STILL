export type UserRole = "member" | "admin";

export type AccessDecision =
  | { kind: "allow" }
  | { kind: "redirect"; destination: "/landing" | "/home" };

export function decideRouteAccess(
  pathname: string,
  role: UserRole | null,
): AccessDecision {
  if (pathname === "/") {
    return { kind: "redirect", destination: role ? "/home" : "/landing" };
  }

  if (pathname === "/landing") {
    return role
      ? { kind: "redirect", destination: "/home" }
      : { kind: "allow" };
  }

  if (!role) {
    return { kind: "redirect", destination: "/landing" };
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return role === "admin"
      ? { kind: "allow" }
      : { kind: "redirect", destination: "/home" };
  }

  return { kind: "allow" };
}
