# CineMatch AI

CineMatch AI is a movie discovery website that helps you find films related to ones you already enjoy. Search the catalog, choose a movie, and get recommendations based on its content and metadata.

**Live website:** [movie-recommendation-system-ujww.onrender.com](https://movie-recommendation-system-ujww.onrender.com/)

## Features

- Search and autocomplete across more than 4,800 movies
- Get similar-movie recommendations from a selected title
- Explore movie ratings, release years, genres, cast, and overviews when available
- Browse featured titles or choose a random movie
- Use the responsive interface on desktop and mobile

## How recommendations work

The project uses a precomputed movie similarity matrix. Movie information is represented as content features, and the model ranks titles with similar feature profiles. The FastAPI backend returns those results to the website.

## Technology

- **Backend:** Python and FastAPI
- **Recommendation data:** NumPy and Pandas
- **Frontend:** HTML, CSS, and JavaScript
- **Deployment:** Docker on Render

## Run locally

Keep `movies.pkl`, `similarity.pkl`, and `movie_meta.json` beside `MOVREC.py`. Then install the dependencies and start the app:

```bash
python -m venv .venv
```

Activate the environment, then run:

```bash
python -m pip install -r requirements.txt
python run_app.py
```

Open <http://127.0.0.1:8000/>. Interactive API documentation is available at <http://127.0.0.1:8000/docs>.

## Main API routes

- `GET /Cinema` — check service health and catalog size
- `GET /api/search?q=...` — search movie titles
- `GET /api/recommend?movie=...&n=...` — get recommendations for a movie
- `GET /api/featured` — retrieve featured movies
- `GET /api/random` — retrieve a random movie

The original `/movies` and `/recommend` routes are also available for compatibility.
