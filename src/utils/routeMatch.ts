// Shared by Sidebar (accordion auto-open) and CasterLayout (active tab) -- both need the
// same "is this route, or a descendant of it, the current one" check, and drift between the
// two would defeat the point of coordinating the sidebar with the Caster tab bar.
export const matchesRoute = (pathname: string, path: string): boolean =>
  pathname === path || pathname.startsWith(`${path}/`);
