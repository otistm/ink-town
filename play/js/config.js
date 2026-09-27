/* =====================================================================
   Ink Town settings. This is the only file you normally need to touch by hand.
   ===================================================================== */
"use strict";
// Shown on the home screen. Bump it with every change you ship.
const VERSION = '0.2.0';
// The money a brand-new town starts with.
const START_MONEY = 20000;
// How many real seconds one whole day (day and night) lasts at normal speed. The fast buttons play 2× and 4×.
const DAY_SECONDS = 900;
// Daylight runs from sunrise to sunset (hours on the town clock); the rest is night. 5:00 to 22:30 is about 73% daytime.
const SUNRISE = 5, SUNSET = 22.5;
// The town ticks along every 10 minutes of town time (about 6 seconds at normal speed): money comes in a bit at a time,
// and people move in and out.
const STEP_HOURS = 1/6;
