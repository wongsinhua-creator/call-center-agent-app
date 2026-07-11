// Fixed owner id for the public demo pool. Anonymous visitors read/write rows
// owned by this id (enforced by RLS in 0002_lock_down.sql). It is a constant,
// not a real auth user — nobody can log in as it.
export const DEMO_USER_ID = "d0000000-0000-0000-0000-000000000001";
