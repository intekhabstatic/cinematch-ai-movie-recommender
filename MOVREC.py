import json
import os
import pickle
import random
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).parent.resolve()


def find_data_file(filename: str) -> Path:
    """Locate model data beside this app or in MOVIE_DATA_DIR."""
    data_dir = Path(os.environ.get("MOVIE_DATA_DIR", BASE_DIR)).expanduser()
    candidates = [data_dir / filename, BASE_DIR / filename]
    for c in candidates:
        if c.exists():
            return c
    raise FileNotFoundError(f"Could not locate '{filename}' in candidate paths: {candidates}")


state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Load movies dataframe (movie_id, title)
    movies_path = find_data_file("movies.pkl")
    with open(movies_path, "rb") as f:
        state["movies"] = pickle.load(f)

    # 2. Load similarity matrix (4806 x 4806 cosine similarity)
    sim_path = find_data_file("similarity.pkl")
    with open(sim_path, "rb") as f:
        state["similarity"] = pickle.load(f)

    # 3. Load rich metadata if available (ratings, genres, director, cast, overview, year)
    state["meta"] = {}
    try:
        meta_path = find_data_file("movie_meta.json")
        with open(meta_path, "r", encoding="utf-8") as f:
            state["meta"] = json.load(f)
    except Exception as e:
        print(f"Notice: movie_meta.json not loaded ({e}). Basic info will be used.")

    # Precompute lowercase lookup structures for instant response times
    state["titles_lower"] = state["movies"]["title"].str.lower()
    state["titles_list"] = state["movies"]["title"].tolist()
    state["movie_ids_list"] = state["movies"]["movie_id"].tolist()
    state["title_to_idx"] = {t.lower(): i for i, t in enumerate(state["titles_list"])}

    print(f"Recommender model initialized with {len(state['movies'])} movies.")
    yield
    state.clear()


app = FastAPI(
    title="Movie Recommendation API & Platform",
    description="Content-Based Machine Learning Movie Recommendation System",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Find static folder
STATIC_DIR = BASE_DIR / "static"
if not STATIC_DIR.exists():
    STATIC_DIR = BASE_DIR.parent / "MOVIEproject" / "static"

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ---- Data Models ----
class Movie(BaseModel):
    movie_id: int
    title: str


class RecommendationResponse(BaseModel):
    movie: str
    recommendations: list[Movie]


class EnrichedMovie(BaseModel):
    movie_id: int
    title: str
    score: float = 1.0
    match_percentage: int = 100
    rating: Optional[float] = None
    year: str = ""
    genres: list[str] = []
    overview: str = ""
    tagline: str = ""
    runtime: Optional[int] = None
    director: str = ""
    cast: list[str] = []


class EnrichedRecommendResponse(BaseModel):
    movie: EnrichedMovie
    recommendations: list[EnrichedMovie]


# ---- Helpers ----
def enrich_movie(movie_id: int, title: str, score: float = 1.0) -> EnrichedMovie:
    meta = state.get("meta", {}).get(str(movie_id), {})
    pct = max(1, min(100, int(round(score * 100))))
    return EnrichedMovie(
        movie_id=movie_id,
        title=title,
        score=round(float(score), 4),
        match_percentage=pct,
        rating=meta.get("rating"),
        year=meta.get("year", ""),
        genres=meta.get("genres", []),
        overview=meta.get("overview", ""),
        tagline=meta.get("tagline", ""),
        runtime=meta.get("runtime"),
        director=meta.get("director", ""),
        cast=meta.get("cast", []),
    )


def find_index(title: str) -> int:
    idx = state["title_to_idx"].get(title.strip().lower())
    if idx is not None:
        return idx
    # Partial match fallback
    q = title.strip().lower()
    matches = [i for i, t in enumerate(state["titles_list"]) if q in t.lower()]
    if matches:
        return matches[0]
    raise HTTPException(status_code=404, detail=f"Movie '{title}' not found in dataset")


# ---- Original Endpoints (100% Backward Compatible) ----
@app.get("/Cinema")
def cinema():
    return {"status": "ok", "movies_loaded": len(state["movies"])}


@app.get("/movies", response_model=list[Movie])
def search_movies(
    q: str = Query("", description="Search text in title"),
    limit: int = Query(20, ge=1, le=100),
):
    movies = state["movies"]
    if q:
        movies = movies[state["titles_lower"].str.contains(q.lower(), regex=False)]
    return movies.head(limit).to_dict(orient="records")


@app.get("/recommend", response_model=RecommendationResponse)
def recommend(
    title: str = Query(..., description="Exact movie title, e.g. Batman Begins"),
    n: int = Query(5, ge=1, le=20, description="Number of recommendations"),
):
    idx = find_index(title)
    scores = state["similarity"][idx]
    top = np.argsort(scores)[::-1]
    top = [i for i in top if i != idx][:n]
    rows = state["movies"].iloc[top]
    return RecommendationResponse(
        movie=state["movies"].iloc[idx]["title"],
        recommendations=rows.to_dict(orient="records"),
    )


# ---- Modern Rich Endpoints for Frontend ----
@app.get("/api/search")
def api_search(q: str = Query("", max_length=100), limit: int = Query(8, ge=1, le=30)):
    """Fast autocomplete with prefix-match preference, year, and genre previews."""
    query = q.strip().lower()
    if not query:
        return {"results": []}

    titles = state["titles_list"]
    movie_ids = state["movie_ids_list"]
    meta = state.get("meta", {})

    starts = []
    contains = []
    for i, t in enumerate(titles):
        t_low = t.lower()
        mid = movie_ids[i]
        m_info = meta.get(str(mid), {})
        item = {
            "movie_id": mid,
            "title": t,
            "year": m_info.get("year", ""),
            "rating": m_info.get("rating"),
            "genres": m_info.get("genres", []),
        }
        if t_low.startswith(query):
            starts.append(item)
        elif query in t_low:
            contains.append(item)

    results = starts + contains
    return {"results": results[:limit]}


@app.get("/api/recommend", response_model=EnrichedRecommendResponse)
def api_recommend(
    movie: str = Query(..., description="Movie title"),
    n: int = Query(6, ge=1, le=24, description="Number of recommendations"),
):
    """Returns top N similar movies with similarity match score and rich metadata."""
    idx = find_index(movie)
    scores = state["similarity"][idx]
    top_indices = np.argsort(-scores)

    source_id = state["movie_ids_list"][idx]
    source_title = state["titles_list"][idx]
    source_movie = enrich_movie(source_id, source_title, score=1.0)

    recs: list[EnrichedMovie] = []
    seen = {source_title.lower()}

    for j in top_indices:
        j = int(j)
        if j == idx:
            continue
        t = state["titles_list"][j]
        if t.lower() in seen:
            continue
        seen.add(t.lower())
        mid = state["movie_ids_list"][j]
        recs.append(enrich_movie(mid, t, float(scores[j])))
        if len(recs) == n:
            break

    return EnrichedRecommendResponse(
        movie=source_movie,
        recommendations=recs,
    )


@app.get("/api/random")
def api_random():
    """Returns a random popular film for instant discovery."""
    titles = state["titles_list"]
    picked = random.choice(titles)
    idx = state["title_to_idx"][picked.lower()]
    mid = state["movie_ids_list"][idx]
    return enrich_movie(mid, picked)


@app.get("/api/featured")
def api_featured():
    """Curated classics to showcase immediately on app launch."""
    curated = [
        "Inception", "The Dark Knight", "Interstellar", "Avatar",
        "The Avengers", "Pulp Fiction", "The Matrix", "Fight Club",
        "Gladiator", "Titanic", "Iron Man", "Forrest Gump"
    ]
    results = []
    for title in curated:
        idx = state["title_to_idx"].get(title.lower())
        if idx is not None:
            mid = state["movie_ids_list"][idx]
            results.append(enrich_movie(mid, state["titles_list"][idx]))
    return {"featured": results}


@app.get("/api/movie/{movie_id}")
def api_movie_details(movie_id: int):
    """Retrieve complete metadata for a specific movie."""
    matches = state["movies"][state["movies"]["movie_id"] == movie_id]
    if matches.empty:
        raise HTTPException(status_code=404, detail="Movie ID not found")
    title = matches.iloc[0]["title"]
    return enrich_movie(movie_id, title)


@app.get("/api/stats")
def api_stats():
    """Model information and metadata statistics."""
    return {
        "total_movies": len(state["movies"]),
        "model": "Cosine Similarity on TF-IDF / Bag of Words",
        "features": ["Plot Overview", "Genres", "Keywords", "Cast", "Director"],
        "status": "Online",
    }


# ---- Web Frontend Route ----
@app.get("/")
def index(request: Request):
    """Serves the frontend web app, or API info if JSON is explicitly requested."""
    accept = request.headers.get("accept", "")
    html_file = STATIC_DIR / "index.html"
    if "text/html" in accept and html_file.exists():
        return FileResponse(html_file)
    if html_file.exists():
        return FileResponse(html_file)
    return {"message": "Movie Recommendation API. See /docs for usage, or add static/index.html"}
