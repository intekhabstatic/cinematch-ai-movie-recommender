"""
CineMatch AI — Movie Recommendation Launcher
Runs the FastAPI app and automatically opens your web browser.
"""

import sys
import os
import time
import webbrowser
from pathlib import Path

def main():
    print("=" * 60)
    print("🎬 CineMatch AI — ML Movie Recommendation Server")
    print("=" * 60)

    # 1. Check Python Dependencies
    missing = []
    for pkg in ["fastapi", "uvicorn", "pandas", "numpy"]:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    
    if missing:
        print(f"Error: Missing required packages: {', '.join(missing)}")
        print("Please install them using: pip install " + " ".join(missing))
        sys.exit(1)

    # 2. Check for data files
    base = Path(__file__).parent
    data_dir = Path(os.environ.get("MOVIE_DATA_DIR", base)).expanduser()
    required_files = [data_dir / "movies.pkl", data_dir / "similarity.pkl"]
    missing_files = [path.name for path in required_files if not path.is_file()]
    if missing_files:
        print(f"Error: Missing model files in {data_dir}: {', '.join(missing_files)}")
        print("Place both files beside MOVREC.py or set MOVIE_DATA_DIR to their folder.")
        sys.exit(1)
    else:
        print("✓ Machine Learning model & data files located.")

    # 3. Import uvicorn and run
    import uvicorn
    import threading

    port = 8000
    url = f"http://127.0.0.1:{port}"

    def open_browser():
        time.sleep(1.2)
        print(f"🚀 Opening web browser at {url} ...")
        webbrowser.open(url)

    threading.Thread(target=open_browser, daemon=True).start()

    print(f"\n⚡ Server starting at: {url}")
    print(f"📖 Swagger Docs at:   {url}/docs")
    print(f"🏥 Health Check at:   {url}/Cinema")
    print("Press Ctrl+C to stop.\n")

    # Change cwd to script directory so imports and static assets resolve consistently.
    os.chdir(str(base))
    uvicorn.run("MOVREC:app", host="127.0.0.1", port=port, reload=True)

if __name__ == "__main__":
    main()
