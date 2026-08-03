// Linear journey stages a blood request moves through once a donor is involved.
const JOURNEY_STAGES = [
  { stage: "open", label: "Request Created" },
  { stage: "matched", label: "Donor Matched" },
  { stage: "accepted", label: "Donation Accepted" },
  { stage: "traveling", label: "Donor On The Way" },
  { stage: "arrived", label: "Donor Arrived" },
  { stage: "donating", label: "Donation In Progress" },
  { stage: "completed", label: "Donation Completed" },
]

// Statuses that count as an in-progress / active journey.
const ACTIVE_STATUSES = ["matched", "accepted", "traveling", "arrived", "donating"]

const STAGE_INDEX = Object.fromEntries(JOURNEY_STAGES.map((s, i) => [s.stage, i]))

// Allowed forward transitions between journey stages.
const TRANSITIONS = {
  matched: ["accepted", "cancelled"],
  accepted: ["traveling", "cancelled"],
  traveling: ["arrived", "cancelled"],
  arrived: ["donating", "completed", "cancelled"],
  donating: ["completed", "cancelled"],
}

function stageLabel(stage) {
  return STAGE_INDEX[stage] !== undefined ? JOURNEY_STAGES[STAGE_INDEX[stage]].label : stage
}

function stageIndex(stage) {
  return STAGE_INDEX[stage] ?? -1
}

function isActive(status) {
  return ACTIVE_STATUSES.includes(status)
}

// Generate a short, readable certificate code, e.g. RD-8K3M2P.
function certificateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let out = ""
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return `RD-${out}`
}

module.exports = {
  JOURNEY_STAGES,
  ACTIVE_STATUSES,
  TRANSITIONS,
  stageLabel,
  stageIndex,
  isActive,
  certificateCode,
}
