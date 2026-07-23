export const ROLE_HIERARCHY = ['user', 'developer', 'reviewer', 'admin', 'super_admin'];

export function checkRole(userRole, minRole) {
  const userIdx = ROLE_HIERARCHY.indexOf(userRole);
  const minIdx = ROLE_HIERARCHY.indexOf(minRole);
  if (userIdx === -1 || minIdx === -1) return false;
  return userIdx >= minIdx;
}
