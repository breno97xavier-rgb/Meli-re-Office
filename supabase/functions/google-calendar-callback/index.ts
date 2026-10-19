import { createCalendarCallback } from '../_shared/google-calendar-core.ts';
import { runtime } from '../_shared/google-calendar-runtime.ts';
// Google cannot send an Office JWT. Authentication here is the hashed, single-use,
// expiring state bound to a user/workspace and checked again in the storage API.
Deno.serve(createCalendarCallback(runtime()));
