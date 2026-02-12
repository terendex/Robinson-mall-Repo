export const placeholderUsers = [
  {
    email: "user@example.com",
    password: "123456",
    name: "Regular Joshua",
    role: "user",
  },
  {
    email: "admin@example.com",
    password: "admin2026",
    name: "Admin Boss",
    role: "admin",
  },
  {
    email: "moderator@example.com",
    password: "modpass",
    name: "Moderator Ana",
    role: "moderator",
  },
  {
    email: "joshua@baguio.ph",
    password: "baguio2026",
    name: "Joshua",
    role: "user",
  },
];

export function findUserByCredentials(email, password) {
  return placeholderUsers.find(
    (u) => u.email === email && u.password === password
  );
}