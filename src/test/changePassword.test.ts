import { describe, expect, it, vi } from "vitest";
import { changePassword } from "@/lib/changePassword";

const account = { id: "account-1", email: "example@example.test" };
const setup = () => ({
  verify: vi.fn().mockResolvedValue({ data: { user: { id: account.id } }, error: null }),
  update: vi.fn().mockResolvedValue({ error: null }),
});

describe("signed-in password changes", () => {
  it("requires the current password before contacting auth", async () => {
    const auth = setup();
    await expect(changePassword(auth, account, "", "NewUnique!42", "NewUnique!42")).rejects.toThrow("current password");
    expect(auth.verify).not.toHaveBeenCalled();
    expect(auth.update).not.toHaveBeenCalled();
  });
  it("rejects an incorrect current password without updating", async () => {
    const auth = setup();
    auth.verify.mockResolvedValue({ data: { user: null }, error: { code: "invalid_credentials", message: "Invalid login credentials" } });
    await expect(changePassword(auth, account, "Wrong!42", "NewUnique!42", "NewUnique!42")).rejects.toThrow("incorrect");
    expect(auth.update).not.toHaveBeenCalled();
  });
  it("rejects a verification for a different account", async () => {
    const auth = setup();
    auth.verify.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
    await expect(changePassword(auth, account, "OldUnique!42", "NewUnique!42", "NewUnique!42")).rejects.toThrow("verify");
    expect(auth.update).not.toHaveBeenCalled();
  });
  it("requires matching confirmation", async () => {
    const auth = setup();
    await expect(changePassword(auth, account, "OldUnique!42", "NewUnique!42", "Different!42")).rejects.toThrow("don't match");
    expect(auth.update).not.toHaveBeenCalled();
  });
  it("sends the verified current password with the update", async () => {
    const auth = setup();
    await changePassword(auth, account, "OldUnique!42", "NewUnique!42", "NewUnique!42");
    expect(auth.verify).toHaveBeenCalledWith(account.email, "OldUnique!42");
    expect(auth.update).toHaveBeenCalledWith({ password: "NewUnique!42", current_password: "OldUnique!42" });
  });
  it("propagates rejected password changes", async () => {
    const auth = setup();
    auth.update.mockResolvedValue({ error: { code: "weak_password", message: "Weak password" } });
    await expect(changePassword(auth, account, "OldUnique!42", "NewUnique!42", "NewUnique!42")).rejects.toThrow("data breach");
  });
});