# Architecture rules

- Signed-in password changes use an isolated, non-persistent auth client to verify the current password before updating the active account; this avoids replacing the user's session during verification. Always pass `current_password` to the update, and keep recovery-link resets exempt.