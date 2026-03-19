export type Role = "admin" | "teacher" | "student";

export type CurrentUser = {
  id: string;
  email: string;
  role: Role;
  display_name: string;
};

const MOCK_USER: CurrentUser = {
  id: "mock-user-1",
  email: "mock@synergos.nl",
  role: "admin",
  display_name: "Mock gebruiker",
};

export function getCurrentUser(): CurrentUser {
  // 🔧 MOCK AUTH AAN
  return MOCK_USER;

  // 🔐 STRAKS (SSO):
  // return fetchCurrentUserFromSSO();
}

export function setMockRole(role: Role) {
  if (typeof window === "undefined") return;
  localStorage.setItem("mock-role", role);
}

export function getMockRole(): Role {
  if (typeof window === "undefined") return "admin";
  return (localStorage.getItem("mock-role") as Role) ?? "admin";
}
