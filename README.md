# CineMatch AI

A movie discovery website that uses content-based machine learning to recommend films similar to the one you select.

**Live website:** [movie-recommendation-system-ujww.onrender.com](https://movie-recommendation-system-ujww.onrender.com/)

## Features

- Search and autocomplete across 4,800+ movies
- Personalized similar-movie recommendations
- Movie details, ratings, genres, and overviews

## Technology

FastAPI · Python · NumPy · Pandas · HTML · CSS · JavaScript

## Run locally

Place `movies.pkl`, `similarity.pkl`, and `movie_meta.json` beside `MOVREC.py`, then run:

```bash
python -m pip install -r requirements.txt
python run_app.py
```

Open <http://127.0.0.1:8000/>. API documentation is available at <http://127.0.0.1:8000/docs>.
