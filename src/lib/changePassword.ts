type AuthError = { message: string; code?: string };
type PasswordChangeAuth = {
  verify: (email: string, password: string) => Promise<{ data: { user: { id: string } | null }; error: AuthError | null }>;
  update: (attributes: { password: string; current_password: string }) => Promise<{ error: AuthError | null }>;
};

export async function changePassword(
  auth: PasswordChangeAuth,
  account: { id: string; email: string },
  current: string,
  password: string,
  confirmation: string,
): Promise<void> {
  if (!current) throw new Error("Enter your current password.");
  if (password.length < 6) throw new Error("New password must be at least 6 characters.");
  if (password !== confirmation) throw new Error("New passwords don't match.");
  if (current === password) throw new Error("Choose a different new password.");

  const verified = await auth.verify(account.email, current);
  if (verified.error || verified.data.user?.id !== account.id) {
    if (verified.error?.code === "invalid_credentials") throw new Error("Current password is incorrect.");
    throw new Error(verified.error?.message ?? "Could not verify your current password.");
  }
  const { error } = await auth.update({ password, current_password: current });
  if (error) {
    if (error.code === "weak_password") throw new Error("Choose a stronger, unique password that hasn't appeared in a data breach.");
    throw new Error(error.message);
  }
}