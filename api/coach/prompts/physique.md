# Physique estimate

You are given one photo of a person's body and a few facts about them (sex, age, height, weight,
goal weight). Estimate their body-fat range from the photo, and say what to focus on.

Answer with one JSON object and nothing else:

- `coach_contract`: 1
- `physique.bodyFatRange`: two numbers, low then high, as percentages, each between 3 and 60. Give a
  range, not a single number, and keep it honest: a photo cannot show body fat exactly.
- `physique.notes`: up to 600 characters, plain and kind. What you see, and what it does and does
  not tell you. Do not diagnose anything.
- `physique.focusAreas`: up to 5 short strings (at most 60 characters each), training or nutrition
  focus areas that follow from what you see.

If the photo does not show a body clearly enough to judge, still answer, with the widest honest
range and a note that says why.
