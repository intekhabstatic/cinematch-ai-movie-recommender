# CineMatch AI

A full-stack movie discovery app built with FastAPI, a static HTML/CSS/JavaScript frontend, and your precomputed movie similarity model.

## Run locally on Windows

Keep `movies.pkl`, `similarity.pkl`, and (optionally) `movie_meta.json` beside `MOVREC.py`. From this folder, run:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python run_app.py
```

The app opens at <http://127.0.0.1:8000/>. Interactive API documentation is at <http://127.0.0.1:8000/docs>.

You can instead run `python -m uvicorn MOVREC:app --host 127.0.0.1 --port 8000`. To store model files elsewhere, set `MOVIE_DATA_DIR` to their folder before starting the server.

## Docker

Build and run the image from this folder:

```sh
docker build -t cinematch-ai .
docker run --rm -p 8000:8000 cinematch-ai
```

The model files are included in the image, so it will be large. For hosted deployments, make sure the service has enough memory to load the similarity matrix and configure the model files as available storage.

## Deploy to a public URL with Render

The repository includes `render.yaml` for a Render Blueprint deployment:

1. Sign in to Render and connect your GitHub account.
2. Choose **New > Blueprint**, then select `intekhabstatic/movie_recommendation_system`.
3. Review the `cinematch-ai` web service and deploy it. The Dockerfile reads Render's assigned `PORT` and binds to `0.0.0.0`.
4. Wait for the deploy to finish, then open the `onrender.com` URL shown in the service dashboard. Confirm `/Cinema` responds with `status: ok` and `movies_loaded: 4806`.

Render's free web services sleep after 15 minutes without traffic and can take about a minute to wake. The free plan has 512 MB RAM; if the model fails to load or the service restarts, check the deploy logs and select a larger plan.

## Features

- Live movie title search and autocomplete
- Content-based recommendations from the precomputed similarity matrix
- Movie details, genres, ratings, and plot summaries when metadata is available
- Featured picks, random discovery, light/dark themes, and responsive layouts
- Same-origin API endpoints served by the FastAPI app

## API

- `GET /Cinema` — health and movie count
- `GET /api/search?q=...` — title autocomplete
- `GET /api/recommend?movie=...&n=...` — recommendations
- `GET /api/featured` — featured movies
- `GET /api/random` — surprise me
- `GET /api/stats` — model information

The original `/movies` and `/recommend` endpoints remain available.
