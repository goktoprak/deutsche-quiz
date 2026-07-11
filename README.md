# Deutsch-Quiz (A2 – B1)

A static German grammar quiz site. All content lives in `data/questions.json` —
you never have to touch the HTML/JS to add new topics or questions.

**Features**

- Topics are generated automatically from the questions file
- Three question types: multiple choice, fill-in-the-blank, word order
- A hint (Tipp) for every question, unlockable 5 seconds after the question appears
- A brief English explanation after every answer
- "Alles gemischt" mode: random questions from all topics
- UI entirely in German; explanations in English

## Run locally

The site loads `data/questions.json` via `fetch`, so it needs to be served over
HTTP (opening `index.html` directly as a file won't work):

```bash
cd deutsche-quiz
python3 -m http.server 8000
# then open http://localhost:8000
```

## Adding topics and questions

Edit `data/questions.json` only. Add a new object to the `categories` array:

```json
{
  "id": "adjektivendungen",
  "name": "Adjektivendungen",
  "icon": "🎨",
  "description": "der gute Mann, ein guter Mann …",
  "questions": [ ... ]
}
```

The new topic card appears automatically on the start screen.

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
- Validate the file after editing:

  ```bash
  python3 -m json.tool data/questions.json > /dev/null && echo OK
  ```
