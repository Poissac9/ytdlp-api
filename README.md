# yt-dlp API Backend

A simple Express.js API that wraps yt-dlp for YouTube audio extraction.
Deploy to Railway for free.

## Endpoints

- `GET /health` - Health check
- `GET /search?q={query}` - Search YouTube
- `GET /audio/{videoId}` - Get audio stream URL
- `POST /import` - Import playlist/video info

## Deploy to Railway

1. Push this folder to a GitHub repo
2. Connect Railway to the repo
3. Railway will auto-detect Dockerfile and deploy

## Environment Variables

None required - works out of the box.
