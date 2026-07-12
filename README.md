# Deutsch-Quiz (A2 – B1)

A static German grammar quiz site. All content lives in per-topic JSON files
in `data/` — you never have to touch the HTML/JS to add new topics or questions.

Live: https://goktoprak.github.io/deutsche-quiz/

**Features**

- Topics are generated automatically from the questions file
- Topics are served in batches of 10 (Teil 1, Teil 2, …), in file order
- Three question types: multiple choice, fill-in-the-blank, word order
- A hint (Tipp) for every question, unlockable 5 seconds after the question appears
- A brief English explanation after every answer
- "Alles gemischt" mode: random questions from all topics
- UI entirely in German; explanations in English

## Run locally

The site loads the JSON files in `data/` via `fetch`, so it needs to be served
over HTTP (opening `index.html` directly as a file won't work):

```bash
cd deutsche-quiz
python3 -m http.server 8000
# then open http://localhost:8000
```

## Adding topics and questions

Each topic is one file in `data/` (e.g. `data/praepositionen.json`), and
`data/index.json` lists which files to load:

```json
{
  "categories": [
    "praepositionen.json",
    "wechselpraepositionen.json",
    "..."
  ]
}
```

**To add questions to an existing topic**, append them to the `questions`
array of that topic's file.

**To add a new topic**, create `data/<id>.json` with this structure and add
the filename to `data/index.json`:

```json
{
  "id": "adjektivendungen",
  "name": "Adjektivendungen",
  "icon": "🎨",
  "description": "der gute Mann, ein guter Mann …",
  "questions": [ ... ]
}
```

The topic card then appears automatically on the start screen.

Each topic is split into batches of 10 questions (Teil 1 = questions 1–10,
Teil 2 = 11–20, …) in the order they appear in the file. New questions
appended to the end of a topic therefore become a new Teil — keep each
topic's question count a multiple of 10 so no Teil is left short.

### Question types

**1. Multiple choice** (`choice`) — options are shuffled on every run:

```json
{
  "type": "choice",
  "question": "Ich fahre ___ dem Bus zur Schule.",
  "options": ["mit", "für", "ohne"],
  "answer": "mit",
  "tip": "Hint in German, unlocked after 5 seconds.",
  "explanation": "Explanation in English, shown after answering."
}
```

**2. Fill in the blank** (`blank`) — `answers` is a list of accepted
answers. Comparison ignores case, extra spaces and ß/ss differences:

```json
{
  "type": "blank",
  "question": "Der Unterricht beginnt ___ 8 Uhr.",
  "answers": ["um"],
  "tip": "…",
  "explanation": "…"
}
```

**3. Word order** (`order`) — the words are shown shuffled and clicked into
order. List every acceptable sentence in `answers` (German often allows more
than one valid order):

```json
{
  "type": "order",
  "question": "Bilde einen Satz:",
  "words": ["Ich", "hänge", "das", "Poster", "an", "die", "Wand"],
  "answers": [
    "Ich hänge das Poster an die Wand",
    "Das Poster hänge ich an die Wand"
  ],
  "tip": "…",
  "explanation": "…"
}
```

### Tips for writing questions

- Keep `tip` in **German** (it's part of the exercise) and `explanation`
  in **English**.
- For `blank` questions, make sure only one word fits — add context to the
  sentence if needed, or list all valid answers in `answers`.
- Validate the files after editing:

  ```bash
  for f in data/*.json; do python3 -m json.tool "$f" > /dev/null || echo "FEHLER: $f"; done && echo OK
  ```
