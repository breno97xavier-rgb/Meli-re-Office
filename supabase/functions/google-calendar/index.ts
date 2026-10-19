import { createCalendarApi } from '../_shared/google-calendar-core.ts';
import { runtime } from '../_shared/google-calendar-runtime.ts';
Deno.serve(createCalendarApi(runtime()));
