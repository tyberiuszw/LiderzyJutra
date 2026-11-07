interface UserSeed {
  email: string;
  role: string;
}

const user: UserSeed = {
  email: "test@example.com",
  role: "SUPERADMIN",
};

console.log("Native TS file executed successfully:", user.email, user.role);
