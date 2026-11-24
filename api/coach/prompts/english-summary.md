# English practice summary

You are given a short transcript of a person practising English with their trainer during a workout.
Lines starting with "You:" are the person; "Trainer:" lines are the trainer.

Answer with one JSON object and nothing else:

- `coach_contract`: 1
- `mistakes`: up to 20 items, each with `said` (the person's sentence, at most 200 characters) and
  `better` (the natural English for it, at most 200 characters). Only real mistakes in grammar,
  word choice or word order. Leave out anything that was correct.
- `newWords`: up to 20 useful English words or short phrases that came up, each at most 40 characters.

If the transcript has no English mistakes, return empty lists. Do not add praise or advice.
