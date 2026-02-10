/* ---------------------------
   utils.js — shared helpers
---------------------------- */

/* ---- Date helpers (pure) ---- */
function pad2(n){ return String(n).padStart(2,"0"); }

function localISODate(d){
  const dt = (d instanceof Date) ? d : new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}`;
}

function todayISO(){ return localISODate(new Date()); }

function parseISO(s){
  const [y,m,dd]=String(s||"").split("-").map(Number);
  return new Date(y, m-1, dd);
}

function sameMonth(d, y, m){ return d.getFullYear()===y && d.getMonth()===m; }

/* ---- Normalization ---- */
function normExName(s){
  return String(s||"")
    .toLowerCase()
    .replace(/\s+/g," ")
    .trim();
}

/* ---------------------------
   Canonical Exercise Naming
   - variants map to ONE canonical label
---------------------------- */
const CANONICAL_EXERCISE_MAP = {
  "cable crunch": "Cable Crunch",
  "cable crunches": "Cable Crunch",

  "leg extension": "Leg Extension",
  "leg extensions": "Leg Extension",

  "standing calf raise": "Standing Calf Raise",
  "standing calf raise (machine)": "Standing Calf Raise",

  "overhead dumbbell tricep extension": "Overhead Dumbbell Tricep Extension",
  "overhead dumbbell triceps extension": "Overhead Dumbbell Tricep Extension",

  "goblet squat": "Goblet Squat",
  "goblet squats": "Goblet Squat",

  "spin bike": "Stationary Bike",
  "stationary bike": "Stationary Bike",
};

function canonicalExerciseName(name){
  const raw = String(name || "").trim();
  if(!raw) return "";
  const key = normExName(raw);
  return CANONICAL_EXERCISE_MAP[key] || raw;
}

function cleanExerciseName(s){
  const raw = String(s || "").trim().replace(/\s+/g, " ");
  if(!raw) return "";
  return canonicalExerciseName(raw);
}

/* ---- UID helper ---- */
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
