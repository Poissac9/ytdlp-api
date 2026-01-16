# 🎵 yt-dlp API Backend

> Self-hosted audio extraction API for AudioMab

This is the backend API service for [AudioMab](https://github.com/Poissac9/AudioMab). It uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) to search YouTube and extract audio streams.

---

## ⚠️ Important Disclaimer

> **This project is for educational and personal use only.**

- **YouTube Terms of Service**: Using this API to extract content from YouTube may violate [YouTube's Terms of Service](https://www.youtube.com/t/terms).
- **No Commercial Use**: This project must **NOT** be used for commercial purposes.
- **Personal Responsibility**: The author(s) are **NOT responsible** for how you use this software.

**By deploying and using this software, you agree to comply with all applicable laws and terms of service.**

---

## 🚀 Deployment on Railway

### Quick Deploy

1. **Fork this repository** to your GitHub account

2. **Create a Railway account** at [railway.app](https://railway.app)

3. **Create a new project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your forked `ytdlp-api` repository

4. **Configure the service**
   - Railway will automatically detect the Dockerfile
   - No environment variables required
   - The service will auto-deploy

5. **Get your public URL**
   - Go to Settings → Networking
   - Click "Generate Domain"
   - Copy your URL (e.g., `https://ytdlp-api-xxxx.up.railway.app`)

6. **Update your frontend**
   - Add `YTDLP_API_URL=https://your-railway-url.up.railway.app` to Vercel environment variables

---

## 🔧 Local Development

### Prerequisites

- Docker (recommended)
- OR Node.js 18+ with Python 3.8+ and yt-dlp installed

### Using Docker

```bash
# Build the image
docker build -t ytdlp-api .

# Run the container
docker run -p 3001:3000 ytdlp-api
```

### Without Docker

1. **Install yt-dlp**
   ```bash
   pip install yt-dlp
   ```

2. **Install Node dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

The API will be available at `http://localhost:3001`

---

## 📡 API Endpoints

### Health Check
```
GET /health
```
Returns server status.

### Search
```
GET /search?q=<query>
```
Search YouTube for videos.

**Response:**
```json
{
  "results": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "Rick Astley - Never Gonna Give You Up",
      "author": "Rick Astley",
      "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      "duration": 212
    }
  ],
  "source": "yt-dlp"
}
```

### Get Audio URL
```
GET /audio/:videoId
```
Get the direct audio stream URL for a video.

**Response:**
```json
{
  "audioUrl": "https://...",
  "title": "Song Title",
  "artist": "Artist Name",
  "thumbnail": "https://...",
  "duration": 212,
  "source": "yt-dlp"
}
```

### Stream Audio (Proxy)
```
GET /stream/:videoId
```
Streams audio directly through the server (bypasses CORS).

### Import Playlist/Video
```
POST /import
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=..."
}
```
Import a YouTube video or playlist.

---

## 🐳 Docker Configuration

The included Dockerfile:
- Uses Python 3.11 slim base image
- Installs Node.js 20
- Installs ffmpeg for audio processing
- Installs the latest yt-dlp
- Runs on port 3000

---

## 🔒 Security Considerations

- This API is designed for personal use
- Consider adding authentication if exposing publicly
- Rate limiting is recommended for production use
- Do not use for commercial purposes

---

## 📁 File Structure

```
ytdlp-api/
├── server.js           # Express API server
├── package.json        # Node dependencies
├── Dockerfile          # Docker configuration
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

---

## 🤝 Contributing

Contributions are welcome! Please read the main project's contributing guidelines.

---

## 👤 Author

**Berly Oge**

- Twitter: [@berlyoge](https://x.com/berlyoge)
- GitHub: [@Poissac9](https://github.com/Poissac9)

<a href="https://x.com/berlyoge">
  <img src="https://img.shields.io/twitter/follow/berlyoge?style=for-the-badge&logo=x&logoColor=white&labelColor=000000&color=1DA1F2" alt="Follow @berlyoge on X">
</a>

---

## ⚖️ Legal Notice

This software is provided "as is", without warranty of any kind. The authors are not responsible for any misuse of this software. 

**This project must not be used for commercial purposes as it may violate YouTube's Terms of Service and Google's API policies.**

---

<p align="center">
  Part of the <a href="https://github.com/Poissac9/AudioMab">AudioMab</a> project
</p>
