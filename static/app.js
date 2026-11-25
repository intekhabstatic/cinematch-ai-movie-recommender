/**
 * CineMatch AI — Modern ML Movie Recommender Frontend
 */

(() => {
  // --- State ---
  const state = {
    selectedCount: 8,
    activeMovie: null,
    searchDebounceTimer: null,
    autocompleteItems: [],
    autocompleteIndex: -1,
    tmdbApiKey: localStorage.getItem("cinematch_tmdb_key") || "",
    currentTheme: localStorage.getItem("cinematch_theme") || "dark",
  };

  // --- Genre Color Schemes for Dynamic Cinema Posters ---
  const GENRE_GRADIENTS = {
    Action: "linear-gradient(145deg, #1f0b0b, #450a0a, #7f1d1d)",
    Adventure: "linear-gradient(145deg, #22150a, #451a03, #78350f)",
    Animation: "linear-gradient(145deg, #1e112a, #3b0764, #6b21a8)",
    Comedy: "linear-gradient(145deg, #231b08, #713f12, #a16207)",
    Crime: "linear-gradient(145deg, #0e1726, #1e293b, #334155)",
    Documentary: "linear-gradient(145deg, #06201b, #064e3b, #047857)",
    Drama: "linear-gradient(145deg, #1e1627, #311042, #581c87)",
    Family: "linear-gradient(145deg, #08212d, #0e7490, #0284c7)",
    Fantasy: "linear-gradient(145deg, #1c0e29, #4a044e, #701a75)",
    History: "linear-gradient(145deg, #24140e, #572918, #7c2d12)",
    Horror: "linear-gradient(145deg, #180505, #2d0606, #450a0a)",
    Music: "linear-gradient(145deg, #1f0824, #701a75, #a21caf)",
    Mystery: "linear-gradient(145deg, #091724, #153e5c, #0369a1)",
    Romance: "linear-gradient(145deg, #260a16, #701a40, #9f1239)",
    "Science Fiction": "linear-gradient(145deg, #051926, #0c4a6e, #0284c7)",
    "Sci-Fi": "linear-gradient(145deg, #051926, #0c4a6e, #0284c7)",
    Thriller: "linear-gradient(145deg, #130a21, #2e1065, #4c1d95)",
    War: "linear-gradient(145deg, #1d1a10, #3f3918, #575323)",
    Western: "linear-gradient(145deg, #26160d, #542d18, #78350f)",
    Default: "linear-gradient(145deg, #111827, #1f2937, #374151)",
  };

  // --- DOM Elements ---
  const el = {
    input: document.getElementById("movieSearchInput"),
    clearBtn: document.getElementById("clearSearchBtn"),
    btnRecommend: document.getElementById("btnRecommend"),
    btnRandom: document.getElementById("btnRandom"),
    dropdown: document.getElementById("autocompleteDropdown"),
    statusBanner: document.getElementById("statusBanner"),
    countPills: document.getElementById("countPills"),
    presetChips: document.querySelectorAll(".chip-btn"),
    sourceSpotlight: document.getElementById("sourceSpotlight"),
    spotlightPoster: document.getElementById("spotlightPoster"),
    spotlightTitle: document.getElementById("spotlightTitle"),
    spotlightMeta: document.getElementById("spotlightMeta"),
    spotlightGenres: document.getElementById("spotlightGenres"),
    spotlightTagline: document.getElementById("spotlightTagline"),
    spotlightOverview: document.getElementById("spotlightOverview"),
    spotlightCredits: document.getElementById("spotlightCredits"),
    resultsSection: document.getElementById("resultsSection"),
    sectionHeader: document.getElementById("sectionHeader"),
    resultsCountBadge: document.getElementById("resultsCountBadge"),
    movieGrid: document.getElementById("movieGrid"),
    initialExploreView: document.getElementById("initialExploreView"),
    featuredGrid: document.getElementById("featuredGrid"),
    // Modals
    movieModal: document.getElementById("movieModal"),
    modalBody: document.getElementById("modalBody"),
    btnModalClose: document.getElementById("btnModalClose"),
    howItWorksModal: document.getElementById("howItWorksModal"),
    btnHowItWorks: document.getElementById("btnHowItWorks"),
    btnHowClose: document.getElementById("btnHowClose"),
    settingsModal: document.getElementById("settingsModal"),
    btnSettings: document.getElementById("btnSettings"),
    btnSettingsClose: document.getElementById("btnSettingsClose"),
    tmdbApiKeyInput: document.getElementById("tmdbApiKeyInput"),
    btnSaveSettings: document.getElementById("btnSaveSettings"),
    btnClearApiKey: document.getElementById("btnClearApiKey"),
    btnThemeToggle: document.getElementById("btnThemeToggle"),
    brandHome: document.getElementById("brandHome"),
  };

  // --- Initialization ---
  function init() {
    applyTheme(state.currentTheme);
    setupEventListeners();
    loadFeaturedMovies();
    if (state.tmdbApiKey && el.tmdbApiKeyInput) {
      el.tmdbApiKeyInput.value = state.tmdbApiKey;
    }
  }

  // --- Theme Handling ---
  function applyTheme(theme) {
    state.currentTheme = theme;
    localStorage.setItem("cinematch_theme", theme);
    if (theme === "light") {
      document.body.classList.add("light-theme");
      document.body.classList.remove("dark-theme");
    } else {
      document.body.classList.add("dark-theme");
      document.body.classList.remove("light-theme");
    }
  }

  // --- Notification / Status Helper ---
  function showStatus(message, type = "info") {
    if (!message) {
      el.statusBanner.style.display = "none";
      return;
    }
    el.statusBanner.className = `status-banner ${type}`;
    el.statusBanner.textContent = message;
    el.statusBanner.style.display = "flex";
  }

  function hideStatus() {
    el.statusBanner.style.display = "none";
  }

  // --- Poster Art Generator ---
  function createPosterArt(movie) {
    const primaryGenre = (movie.genres && movie.genres[0]) || "Default";
    const bgGradient = GENRE_GRADIENTS[primaryGenre] || GENRE_GRADIENTS.Default;
    const year = movie.year || "";
    const rating = movie.rating ? `★ ${movie.rating}` : "";

    const wrap = document.createElement("div");
    wrap.className = "cinema-poster-art";
    wrap.style.background = bgGradient;

    wrap.innerHTML = `
      <svg class="poster-film-reel" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <circle cx="50" cy="50" r="45" stroke-width="3"></circle>
        <circle cx="50" cy="50" r="18" stroke-width="3"></circle>
        <circle cx="50" cy="22" r="8" fill="currentColor"></circle>
        <circle cx="50" cy="78" r="8" fill="currentColor"></circle>
        <circle cx="22" cy="50" r="8" fill="currentColor"></circle>
        <circle cx="78" cy="50" r="8" fill="currentColor"></circle>
      </svg>
      <div class="poster-top-bar">
        <span class="poster-genre-indicator">${escapeHtml(primaryGenre)}</span>
        <span class="poster-film-badge">🎬</span>
      </div>
      <div class="poster-body">
        <svg class="poster-film-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <h3 class="poster-headline">${escapeHtml(movie.title)}</h3>
      </div>
      <div class="poster-footer">
        <span>${escapeHtml(year)}</span>
        <span style="color:#fbbf24;font-weight:700;">${escapeHtml(rating)}</span>
      </div>
    `;

    // Attempt TMDB HD poster fetch if an API key is available
    if (state.tmdbApiKey && movie.movie_id) {
      tryFetchTmdbPoster(movie.movie_id, wrap);
    }

    return wrap;
  }

  async function tryFetchTmdbPoster(movieId, posterContainer) {
    try {
      const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${encodeURIComponent(state.tmdbApiKey)}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data.poster_path) {
        const img = new Image();
        img.src = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
        img.alt = data.title || "Movie poster";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.onload = () => {
          posterContainer.replaceChildren(img);
        };
      }
    } catch (_) {
      // Graceful fallback to cinema art
    }
  }

  // --- Autocomplete Handling ---
  async function fetchAutocomplete(query) {
    const q = query.trim();
    if (!q) {
      closeAutocomplete();
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=7`);
      if (!res.ok) return;
      const data = await res.json();
      state.autocompleteItems = data.results || [];
      renderAutocomplete();
    } catch (_) {
      closeAutocomplete();
    }
  }

  function renderAutocomplete() {
    el.dropdown.replaceChildren();
    state.autocompleteIndex = -1;

    if (!state.autocompleteItems.length) {
      closeAutocomplete();
      return;
    }

    state.autocompleteItems.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "autocomplete-item";
      row.dataset.index = index;

      const genre = item.genres && item.genres[0] ? `<span class="auto-genre-pill">${escapeHtml(item.genres[0])}</span>` : "";
      const rating = item.rating ? `<span class="auto-rating">★ ${item.rating}</span>` : "";

      row.innerHTML = `
        <div class="auto-left">
          <span class="auto-film-icon">🎬</span>
          <div>
            <span class="auto-title">${escapeHtml(item.title)}</span>
            ${item.year ? `<span class="auto-year"> (${escapeHtml(item.year)})</span>` : ""}
          </div>
        </div>
        <div class="auto-right">
          ${genre}
          ${rating}
        </div>
      `;

      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectAutocompleteItem(item.title);
      });

      el.dropdown.appendChild(row);
    });

    el.dropdown.style.display = "block";
  }

  function selectAutocompleteItem(title) {
    el.input.value = title;
    closeAutocomplete();
    triggerRecommendation(title);
  }

  function closeAutocomplete() {
    el.dropdown.style.display = "none";
    state.autocompleteItems = [];
    state.autocompleteIndex = -1;
  }

  // --- Recommendation Engine Call ---
  async function triggerRecommendation(movieTitle) {
    const title = (movieTitle || el.input.value).trim();
    if (!title) {
      showStatus("Please enter a movie title to find recommendations.", "error");
      return;
    }

    closeAutocomplete();
    showStatus(`Analyzing natural language vectors for "${title}"...`, "loading");
    window.scrollTo({ top: 180, behavior: "smooth" });

    try {
      const n = state.selectedCount;
      const res = await fetch(`/api/recommend?movie=${encodeURIComponent(title)}&n=${n}`);

      if (res.status === 404) {
        showStatus(`Movie "${title}" not found in our 4,800+ dataset. Pick a title from the suggestions!`, "error");
        return;
      }
      if (!res.ok) {
        throw new Error("Server returned an error");
      }

      const data = await res.json();
      hideStatus();

      // Render Source Spotlight & Recommendations
      renderSpotlight(data.movie);
      renderRecommendations(data.recommendations);
    } catch (err) {
      showStatus("Could not connect to the recommendation API. Ensure the server is running.", "error");
    }
  }

  // --- Render Spotlight (Selected Movie) ---
  function renderSpotlight(movie) {
    state.activeMovie = movie;
    el.spotlightTitle.textContent = movie.title;

    // Poster
    el.spotlightPoster.replaceChildren(createPosterArt(movie));

    // Meta row
    const metaParts = [];
    if (movie.year) metaParts.push(`<span>${escapeHtml(movie.year)}</span>`);
    if (movie.runtime) metaParts.push(`<span>${movie.runtime} min</span>`);
    if (movie.rating) metaParts.push(`<span style="color:#fbbf24;font-weight:700;">★ ${movie.rating}/10</span>`);
    el.spotlightMeta.innerHTML = metaParts.join(" • ");

    // Genres
    el.spotlightGenres.replaceChildren();
    (movie.genres || []).forEach((g) => {
      const tag = document.createElement("span");
      tag.className = "genre-tag";
      tag.textContent = g;
      el.spotlightGenres.appendChild(tag);
    });

    // Tagline & Overview
    el.spotlightTagline.textContent = movie.tagline ? `"${movie.tagline}"` : "";
    el.spotlightOverview.textContent = movie.overview || "No overview available.";

    // Credits
    const creditParts = [];
    if (movie.director) creditParts.push(`<strong>Director:</strong> ${escapeHtml(movie.director)}`);
    if (movie.cast && movie.cast.length) {
      creditParts.push(`<strong>Stars:</strong> ${escapeHtml(movie.cast.slice(0, 3).join(", "))}`);
    }
    el.spotlightCredits.innerHTML = creditParts.join(" | ");

    el.sourceSpotlight.style.display = "block";
  }

  // --- Render Recommendation Grid ---
  function renderRecommendations(recommendations) {
    el.initialExploreView.style.display = "none";
    el.sectionHeader.style.display = "block";
    el.resultsCountBadge.textContent = `${recommendations.length} recommended`;
    el.movieGrid.replaceChildren();

    recommendations.forEach((m) => {
      const card = createMovieCard(m);
      el.movieGrid.appendChild(card);
    });
  }

  // --- Create Single Movie Card ---
  function createMovieCard(movie) {
    const card = document.createElement("div");
    card.className = "movie-card";

    // Poster Wrap with Match Score Badge
    const posterWrap = document.createElement("div");
    posterWrap.className = "card-poster-wrap";

    const scorePct = movie.match_percentage || Math.round(movie.score * 100);
    const scoreBadge = document.createElement("div");
    const scoreClass = scorePct >= 85 ? "high" : scorePct >= 70 ? "med" : "fair";
    scoreBadge.className = `match-score-badge ${scoreClass}`;
    scoreBadge.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
      <span>${scorePct}% Match</span>
    `;

    posterWrap.appendChild(scoreBadge);
    posterWrap.appendChild(createPosterArt(movie));

    // Content Wrap
    const contentWrap = document.createElement("div");
    contentWrap.className = "card-content";

    const ratingHtml = movie.rating ? `<span class="card-rating">★ ${movie.rating}</span>` : "";
    const yearHtml = movie.year ? `<span>${escapeHtml(movie.year)}</span>` : "";

    const genrePills = (movie.genres || [])
      .slice(0, 2)
      .map((g) => `<span class="genre-tag">${escapeHtml(g)}</span>`)
      .join("");

    contentWrap.innerHTML = `
      <h4 class="card-title" title="${escapeHtml(movie.title)}">${escapeHtml(movie.title)}</h4>
      <div class="card-meta">
        ${yearHtml}
        ${ratingHtml}
      </div>
      <div class="card-genres">${genrePills}</div>
      <p class="card-overview">${escapeHtml(movie.overview || "Click to view storyline details.")}</p>
      <div class="card-actions">
        <button class="card-btn-recommend" title="Generate recommendations for this movie">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Find Similar</span>
        </button>
        <button class="card-btn-details" title="Details & ML Match">Info</button>
      </div>
    `;

    // Button Listeners
    contentWrap.querySelector(".card-btn-recommend").addEventListener("click", () => {
      el.input.value = movie.title;
      triggerRecommendation(movie.title);
    });

    contentWrap.querySelector(".card-btn-details").addEventListener("click", () => {
      openMovieModal(movie);
    });

    card.appendChild(posterWrap);
    card.appendChild(contentWrap);
    return card;
  }

  // --- Movie Details Modal ---
  function openMovieModal(movie) {
    const pct = movie.match_percentage || Math.round((movie.score || 1) * 100);
    const scoreVal = movie.score != null ? movie.score.toFixed(4) : "1.0000";

    el.modalBody.innerHTML = `
      <div style="display:flex; gap:20px; margin-bottom:18px;">
        <div style="width:140px; aspect-ratio:2/3; flex-shrink:0; border-radius:10px; overflow:hidden;">
          ${createPosterArt(movie).outerHTML}
        </div>
        <div>
          <h2 style="font-family:var(--font-display); font-size:1.45rem; margin-bottom:4px;">${escapeHtml(movie.title)}</h2>
          <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:10px;">
            ${movie.year ? `Year: <strong>${escapeHtml(movie.year)}</strong> • ` : ""}
            ${movie.rating ? `Rating: <strong style="color:#fbbf24;">★ ${movie.rating}/10</strong> • ` : ""}
            ${movie.runtime ? `Runtime: <strong>${movie.runtime} min</strong>` : ""}
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
            ${(movie.genres || []).map((g) => `<span class="genre-tag">${escapeHtml(g)}</span>`).join("")}
          </div>
          <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.4;">
            ${movie.director ? `<div><strong>Director:</strong> ${escapeHtml(movie.director)}</div>` : ""}
            ${movie.cast && movie.cast.length ? `<div><strong>Cast:</strong> ${escapeHtml(movie.cast.join(", "))}</div>` : ""}
          </div>
        </div>
      </div>

      <div style="background:rgba(0,0,0,0.25); border:1px solid var(--border-color); border-radius:10px; padding:14px; margin-bottom:16px;">
        <h4 style="font-size:0.92rem; margin-bottom:6px; color:var(--text-primary);">Storyline Overview</h4>
        <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.6;">${escapeHtml(movie.overview || "No plot overview registered.")}</p>
      </div>

      <div style="background:rgba(16, 185, 129, 0.08); border:1px solid rgba(16, 185, 129, 0.3); border-radius:10px; padding:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <h4 style="font-size:0.92rem; color:var(--accent-emerald);">Machine Learning Vector Distance</h4>
          <span style="font-weight:700; color:var(--accent-emerald); font-size:1rem;">${pct}% Similarity</span>
        </div>
        <p style="font-size:0.82rem; color:var(--text-secondary); line-height:1.5;">
          Cosine Similarity Metric: <code>${scoreVal}</code>. Computed across text tokens of plot keywords, genre tags, director style, and actor cast overlap.
        </p>
      </div>

      <div style="margin-top:20px; display:flex; justify-content:flex-end;">
        <button class="primary-btn" id="btnModalRecommend">Find Similar to This</button>
      </div>
    `;

    document.getElementById("btnModalRecommend").addEventListener("click", () => {
      closeModal(el.movieModal);
      el.input.value = movie.title;
      triggerRecommendation(movie.title);
    });

    openModal(el.movieModal);
  }

  // --- Initial Featured Movies Loader ---
  async function loadFeaturedMovies() {
    try {
      const res = await fetch("/api/featured");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.featured || !data.featured.length) return;

      el.featuredGrid.replaceChildren();
      data.featured.slice(0, 8).forEach((movie) => {
        const card = createMovieCard(movie);
        el.featuredGrid.appendChild(card);
      });
    } catch (_) {
      el.featuredGrid.innerHTML = `<p style="color:var(--text-muted); text-align:center; grid-column:1/-1;">Use the search bar above to begin exploring.</p>`;
    }
  }

  // --- Modal Helpers ---
  function openModal(modal) {
    modal.style.display = "grid";
  }
  function closeModal(modal) {
    modal.style.display = "none";
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    // Autocomplete Input
    el.input.addEventListener("input", () => {
      const val = el.input.value;
      el.clearBtn.style.display = val ? "block" : "none";
      clearTimeout(state.searchDebounceTimer);
      state.searchDebounceTimer = setTimeout(() => {
        fetchAutocomplete(val);
      }, 160);
    });

    el.clearBtn.addEventListener("click", () => {
      el.input.value = "";
      el.clearBtn.style.display = "none";
      closeAutocomplete();
      el.input.focus();
    });

    // Keyboard Navigation for Autocomplete
    el.input.addEventListener("keydown", (e) => {
      const items = el.dropdown.querySelectorAll(".autocomplete-item");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!items.length) return;
        state.autocompleteIndex = (state.autocompleteIndex + 1) % items.length;
        updateActiveAutocompleteItem(items);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!items.length) return;
        state.autocompleteIndex = (state.autocompleteIndex - 1 + items.length) % items.length;
        updateActiveAutocompleteItem(items);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (state.autocompleteIndex >= 0 && state.autocompleteItems[state.autocompleteIndex]) {
          selectAutocompleteItem(state.autocompleteItems[state.autocompleteIndex].title);
        } else {
          closeAutocomplete();
          triggerRecommendation(el.input.value);
        }
      } else if (e.key === "Escape") {
        closeAutocomplete();
      }
    });

    document.addEventListener("click", (e) => {
      if (!el.dropdown.contains(e.target) && e.target !== el.input) {
        closeAutocomplete();
      }
    });

    // Recommend Button
    el.btnRecommend.addEventListener("click", () => {
      triggerRecommendation(el.input.value);
    });

    // Random Movie Button
    el.btnRandom.addEventListener("click", async () => {
      showStatus("Selecting a random cinema title...", "loading");
      try {
        const res = await fetch("/api/random");
        if (!res.ok) throw new Error();
        const data = await res.json();
        el.input.value = data.title;
        el.clearBtn.style.display = "block";
        triggerRecommendation(data.title);
      } catch (_) {
        showStatus("Could not fetch a random film.", "error");
      }
    });

    // Recommendation Count Pills
    el.countPills.querySelectorAll(".count-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        el.countPills.querySelectorAll(".count-pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        state.selectedCount = parseInt(pill.dataset.n, 10);
        if (state.activeMovie) {
          triggerRecommendation(state.activeMovie.title);
        }
      });
    });

    // Preset Chips
    el.presetChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const movie = chip.dataset.movie;
        el.input.value = movie;
        el.clearBtn.style.display = "block";
        triggerRecommendation(movie);
      });
    });

    // Brand Home Click
    el.brandHome.addEventListener("click", () => {
      el.input.value = "";
      el.sourceSpotlight.style.display = "none";
      el.sectionHeader.style.display = "none";
      el.movieGrid.replaceChildren();
      el.initialExploreView.style.display = "block";
      hideStatus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Modals
    el.btnModalClose.addEventListener("click", () => closeModal(el.movieModal));
    el.btnHowItWorks.addEventListener("click", () => openModal(el.howItWorksModal));
    el.btnHowClose.addEventListener("click", () => closeModal(el.howItWorksModal));
    el.btnSettings.addEventListener("click", () => openModal(el.settingsModal));
    el.btnSettingsClose.addEventListener("click", () => closeModal(el.settingsModal));

    [el.movieModal, el.howItWorksModal, el.settingsModal].forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    // Settings Save
    el.btnSaveSettings.addEventListener("click", () => {
      const key = el.tmdbApiKeyInput.value.trim();
      state.tmdbApiKey = key;
      if (key) {
        localStorage.setItem("cinematch_tmdb_key", key);
        alert("TMDB API Key saved! Refresh or click Recommend to load official posters.");
      } else {
        localStorage.removeItem("cinematch_tmdb_key");
      }
      closeModal(el.settingsModal);
    });

    el.btnClearApiKey.addEventListener("click", () => {
      el.tmdbApiKeyInput.value = "";
      state.tmdbApiKey = "";
      localStorage.removeItem("cinematch_tmdb_key");
      alert("TMDB Key removed. App will use built-in cinematic poster art.");
      closeModal(el.settingsModal);
    });

    // Theme Toggle
    el.btnThemeToggle.addEventListener("click", () => {
      const nextTheme = state.currentTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
    });

    // Global Key Shortcuts (e.g. '/' focuses search)
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== el.input) {
        e.preventDefault();
        el.input.focus();
        el.input.select();
      }
    });
  }

  function updateActiveAutocompleteItem(items) {
    items.forEach((item, i) => {
      item.classList.toggle("active", i === state.autocompleteIndex);
      if (i === state.autocompleteIndex) {
        item.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Run on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
