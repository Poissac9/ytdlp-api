const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to run yt-dlp
function runYtdlp(args) {
    return new Promise((resolve, reject) => {
        const ytdlp = spawn('yt-dlp', args);
        let stdout = '';
        let stderr = '';

        ytdlp.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ytdlp.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ytdlp.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(stderr || `yt-dlp exited with code ${code}`));
            }
        });

        ytdlp.on('error', (err) => {
            reject(err);
        });
    });
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

// Search YouTube
app.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        const limit = parseInt(req.query.limit) || 20; // Get more to filter

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const args = [
            `ytsearch${limit}:${query}`,
            '--dump-json',
            '--flat-playlist',
            '--no-warnings',
        ];

        const output = await runYtdlp(args);
        const results = output
            .trim()
            .split('\n')
            .filter(line => line)
            .map(line => {
                try {
                    const data = JSON.parse(line);
                    // Skip channels (IDs starting with UC) and playlists
                    if (!data.id || data.id.startsWith('UC') || data.id.startsWith('PL')) {
                        return null;
                    }
                    // Valid YouTube video IDs are 11 characters
                    if (data.id.length !== 11) {
                        return null;
                    }
                    return {
                        id: data.id,
                        videoId: data.id,
                        title: data.title,
                        uploader: data.uploader || data.channel,
                        duration: data.duration,
                        thumbnail: data.thumbnails?.[0]?.url ||
                            `https://i.ytimg.com/vi/${data.id}/mqdefault.jpg`,
                    };
                } catch {
                    return null;
                }
            })
            .filter(Boolean)
            .slice(0, 15); // Limit to 15 results

        res.json({ results, source: 'yt-dlp' });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get audio URL for a video
app.get('/audio/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;

        if (!videoId) {
            return res.status(400).json({ error: 'Video ID is required' });
        }

        const args = [
            `https://www.youtube.com/watch?v=${videoId}`,
            '--dump-json',
            '-f', 'bestaudio',
            '--no-warnings',
        ];

        const output = await runYtdlp(args);
        const data = JSON.parse(output);

        res.json({
            audioUrl: data.url,
            title: data.title,
            artist: data.uploader || data.channel,
            thumbnail: data.thumbnail ||
                `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            duration: data.duration,
            source: 'yt-dlp',
        });
    } catch (error) {
        console.error('Audio error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stream audio through proxy (bypasses CORS)
app.get('/stream/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;

        if (!videoId) {
            return res.status(400).json({ error: 'Video ID is required' });
        }

        // Get the audio URL from yt-dlp
        // Try m4a first for better compatibility, fallback to bestaudio
        const args = [
            `https://www.youtube.com/watch?v=${videoId}`,
            '--dump-json',
            '-f', 'bestaudio[ext=m4a]/bestaudio',
            '--no-warnings',
        ];

        const output = await runYtdlp(args);
        const data = JSON.parse(output);
        const audioUrl = data.url;

        if (!audioUrl) {
            return res.status(500).json({ error: 'No audio URL found' });
        }

        const makeRequest = (url, attempt = 0) => {
            if (attempt > 5) {
                res.status(500).json({ error: 'Too many redirects' });
                return;
            }

            const https = require('https');
            const http = require('http');
            const protocol = url.startsWith('https') ? https : http;

            const options = {
                headers: {}
            };

            // Forward Range header if present
            if (req.headers.range) {
                options.headers['Range'] = req.headers.range;
            }

            protocol.get(url, options, (proxyRes) => {
                // Handle Redirects
                if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                    // Consume response to free memory
                    proxyRes.resume();
                    makeRequest(proxyRes.headers.location, attempt + 1);
                    return;
                }

                // Handle Errors
                if (proxyRes.statusCode >= 400) {
                    console.error('Proxy received upstream error:', proxyRes.statusCode);
                    // Consume response
                    proxyRes.resume();
                    res.status(proxyRes.statusCode).json({ error: `Upstream error ${proxyRes.statusCode}` });
                    return;
                }

                // Forward status and headers
                res.status(proxyRes.statusCode);

                const forwardHeaders = [
                    'content-type',
                    'content-length',
                    'accept-ranges',
                    'content-range',
                    'cache-control',
                    'last-modified'
                ];

                forwardHeaders.forEach(h => {
                    if (proxyRes.headers[h]) {
                        res.setHeader(h, proxyRes.headers[h]);
                    }
                });

                // Pipe data
                proxyRes.pipe(res);
            }).on('error', (err) => {
                console.error('Stream proxy connection error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Stream connection failed' });
                }
            });
        };

        makeRequest(audioUrl);

    } catch (error) {
        console.error('Stream error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Import playlist or video
app.post('/import', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Check if it's a playlist
        const isPlaylist = url.includes('list=');

        if (isPlaylist) {
            // Get playlist info
            const args = [
                url,
                '--dump-json',
                '--flat-playlist',
                '--no-warnings',
            ];

            const output = await runYtdlp(args);
            const lines = output.trim().split('\n').filter(line => line);

            // First line is playlist info, rest are videos
            const tracks = lines.map(line => {
                try {
                    const data = JSON.parse(line);
                    return {
                        id: data.id,
                        videoId: data.id,
                        title: data.title,
                        artist: data.uploader || data.channel || 'Unknown',
                        duration: data.duration || 0,
                        thumbnail: data.thumbnails?.[0]?.url ||
                            `https://i.ytimg.com/vi/${data.id}/mqdefault.jpg`,
                    };
                } catch {
                    return null;
                }
            }).filter(Boolean);

            // Get playlist metadata
            const playlistArgs = [
                url,
                '--dump-single-json',
                '--flat-playlist',
                '--no-warnings',
            ];

            const playlistOutput = await runYtdlp(playlistArgs);
            const playlistData = JSON.parse(playlistOutput);

            res.json({
                data: {
                    id: playlistData.id,
                    title: playlistData.title,
                    author: playlistData.uploader || playlistData.channel,
                    thumbnail: playlistData.thumbnails?.[0]?.url ||
                        tracks[0]?.thumbnail,
                    tracks,
                },
                source: 'yt-dlp',
            });
        } else {
            // Single video
            const args = [
                url,
                '--dump-json',
                '--no-warnings',
            ];

            const output = await runYtdlp(args);
            const data = JSON.parse(output);

            res.json({
                data: {
                    id: data.id,
                    title: data.title,
                    author: data.uploader || data.channel,
                    thumbnail: data.thumbnail ||
                        `https://i.ytimg.com/vi/${data.id}/mqdefault.jpg`,
                    tracks: [{
                        id: data.id,
                        videoId: data.id,
                        title: data.title,
                        artist: data.uploader || data.channel,
                        duration: data.duration,
                        thumbnail: data.thumbnail ||
                            `https://i.ytimg.com/vi/${data.id}/mqdefault.jpg`,
                    }],
                },
                source: 'yt-dlp',
            });
        }
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`yt-dlp API server running on port ${PORT}`);
});
