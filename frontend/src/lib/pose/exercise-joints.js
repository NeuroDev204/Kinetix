// Which joint's angle counts the reps of each lift (catalogue ids). Unmapped exercises return null,
// and the app then does no pose analysis for them.
//   3593 barbell squat      -> knee     1197 squat (body weight) -> knee
//   0612 lunge              -> knee     0032 barbell deadlift    -> hip
//   0025 barbell bench press -> elbow   0091 barbell seated overhead press -> elbow
//   0027 barbell bent over row -> elbow 0652 pull-up            -> elbow
const JOINTS = {
  3593: 'knee', 1197: 'knee', 612: 'knee', '0612': 'knee',
  '0032': 'hip',
  '0025': 'elbow', '0091': 'elbow', '0027': 'elbow', '0652': 'elbow',
}

export function jointFor(exerciseId) {
  const id = String(exerciseId ?? '')
  return JOINTS[id] || JOINTS[String(Number(id))] || null
}
