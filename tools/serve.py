"""Tiny static dev server with caching disabled (Python standard library only).

Usage:  python tools/serve.py [port]      (default 8123, serves the project root)

Why not plain `python -m http.server`: browsers heuristically cache old HTML/JS from it, so after an edit the
browser can keep showing the previous version of a page. `Cache-Control: no-store` prevents that.
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    # Threaded AND a long listen queue on purpose: the landing page loads a dozen animated-emoji files at once, and
    # the default single-threaded server with a queue of 5 refuses most of those connections (measured: ~85 %
    # refused for 39 parallel requests; threads alone still ~30 %).
    request_queue_size = 128
    allow_reuse_address = True


with Server(("127.0.0.1", PORT), Handler) as server:
    print(f"Serving {ROOT} at http://127.0.0.1:{PORT}/  (Ctrl+C to stop)")
    server.serve_forever()
