#!/usr/bin/env python3
"""Rebuild music.html from Spotify: top artists, top songs, and recent plays.

Runs on a schedule in GitHub Actions. Needs three secrets in the environment:
SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN.

Only names are published: no play times, no listening history beyond the last few songs.
With --fake it builds from sample data, for testing without keys.
"""
import base64, html, json, os, sys, urllib.parse, urllib.request

SITE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PAGE = os.path.join(SITE, "music.html")
PROFILE = "https://open.spotify.com/user/seiverbeevs"


def token():
    cid, secret, refresh = (os.environ[k] for k in
                            ("SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "SPOTIFY_REFRESH_TOKEN"))
    req = urllib.request.Request(
        "https://accounts.spotify.com/api/token",
        data=urllib.parse.urlencode({"grant_type": "refresh_token", "refresh_token": refresh}).encode(),
        headers={"Authorization": "Basic " + base64.b64encode(f"{cid}:{secret}".encode()).decode(),
                 "Content-Type": "application/x-www-form-urlencoded"})
    return json.load(urllib.request.urlopen(req))["access_token"]


def get(path, tok):
    req = urllib.request.Request("https://api.spotify.com/v1" + path,
                                 headers={"Authorization": f"Bearer {tok}"})
    return json.load(urllib.request.urlopen(req))


def fetch():
    tok = token()
    url = lambda x: x.get("external_urls", {}).get("spotify", "")
    artists = [(a["name"], url(a)) for a in get("/me/top/artists?time_range=short_term&limit=10", tok)["items"]]
    songs = [(t["name"], ", ".join(a["name"] for a in t["artists"]), url(t))
             for t in get("/me/top/tracks?time_range=short_term&limit=10", tok)["items"]]
    recent, seen = [], set()
    for item in get("/me/player/recently-played?limit=50", tok)["items"]:
        t = item["track"]
        key = t["id"]
        if key in seen:
            continue
        seen.add(key)
        recent.append((t["name"], ", ".join(a["name"] for a in t["artists"]), url(t)))
        if len(recent) == 10:
            break
    return artists, songs, recent


def fake():
    a = "https://open.spotify.com/artist/4TMHGUX5WI7OOm53PqSDAT"
    return ([("Grateful Dead", a), ("Goose", a), ("Mt. Joy", a)],
            [("Eyes of the World", "Grateful Dead", a), ("Arcadia", "Goose", a)],
            [("Here Comes Sunshine", "Grateful Dead", a)])


def build(artists, songs, recent):
    with open(PAGE, encoding="utf-8") as f:
        template = f.read()
    head = template[:template.index("<body>")]
    esc = lambda s: html.escape(s, quote=False)
    link = lambda text, u: (f'<a href="{html.escape(u)}" target="_blank" rel="noopener">{esc(text)}</a>' if u else esc(text))
    li = lambda text, u: f'                <li class="bird"><span>{link(text, u)}</span></li>'
    song = lambda n, a, u: f'                <li class="bird"><span>{link(n, u)}</span><span class="meta"> · {esc(a)}</span></li>'
    block = lambda title, rows: (f'            <p class="year">{title}</p>\n            <ul class="feed">\n'
                                 + "\n".join(rows) + "\n            </ul>\n") if rows else ""
    body = f'''<body>
        <header>
            <nav>
                <a href="index.html">Home</a> &gt; <span>Music</span>
            </nav>
            <a class="profile" href="{PROFILE}" target="_blank" rel="me">profile ↗</a>
        </header>
        <main>
{block("recently played", [song(*r) for r in recent])}{block("top songs this month", [song(*r) for r in songs])}{block("top artists this month", [li(*r) for r in artists])}        </main>
        <footer>
            <p>Thanks for stopping by.</p>
        </footer>
    <script src="site.js" defer></script>
    </body>
</html>
'''
    out = head + body
    with open(PAGE, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"music.html: {len(artists)} artists, {len(songs)} songs, {len(recent)} recent")


def redirect():
    # nothing to show: send visitors straight to the Spotify profile
    with open(PAGE, encoding="utf-8") as f:
        template = f.read()
    head = template[:template.index("<body>")].replace(
        "<head>", f'<head>\n        <meta http-equiv="refresh" content="0; url={PROFILE}" />', 1)
    with open(PAGE, "w", encoding="utf-8") as f:
        f.write(head + f'''<body>
    <script>location.replace("{PROFILE}")</script>
    <p><a href="{PROFILE}">music</a></p>
    </body>
</html>
''')
    print("music.html: redirecting to Spotify profile")


def has_content():
    with open(PAGE, encoding="utf-8") as f:
        return 'class="bird"' in f.read()


if __name__ == "__main__":
    if "--fake" in sys.argv:
        build(*fake())
        sys.exit()
    try:
        data = fetch()
    except Exception as e:
        print(f"Spotify error: {e}")
        if has_content():
            print("keeping the last good page")
        else:
            redirect()
        sys.exit()
    if any(data):
        build(*data)
    else:
        redirect()
