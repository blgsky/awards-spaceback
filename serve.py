#!/usr/bin/env python3
"""Static file server with HTTP Range support (needed for video seeking/scrubbing)."""
import http.server
import os
import re
import socketserver

PORT = 8123
ROOT = os.path.dirname(os.path.abspath(__file__))
# Media is cached by the browser so scrubbing seeks hit memory, not the network.
CACHEABLE_EXT = (".mp4", ".webm", ".mov", ".m4v", ".svg", ".woff", ".woff2")


class RangeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        # Let the browser cache media (so video seeks are instant); keep
        # code/markup fresh during development.
        if self.path.lower().split("?")[0].endswith(CACHEABLE_EXT):
            self.send_header("Cache-Control", "public, max-age=86400")
        else:
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        range_header = self.headers.get("Range")
        if not range_header:
            return super().do_GET()

        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().do_GET()

        m = re.match(r"bytes=(\d*)-(\d*)", range_header)
        if not m:
            return super().do_GET()

        size = os.path.getsize(path)
        start = int(m.group(1)) if m.group(1) else 0
        end = int(m.group(2)) if m.group(2) else size - 1
        end = min(end, size - 1)
        if start > end:
            self.send_error(416, "Requested Range Not Satisfiable")
            return
        length = end - start + 1

        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(length))
        self.end_headers()
        try:
            with open(path, "rb") as f:
                f.seek(start)
                self.wfile.write(f.read(length))
        except (BrokenPipeError, ConnectionResetError):
            # Browser aborted the range request (normal during scrubbing).
            pass

    def log_message(self, *args):
        pass  # quiet logs


class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    with ThreadingServer(("127.0.0.1", PORT), RangeHandler) as httpd:
        print(f"Serving {ROOT} at http://127.0.0.1:{PORT} (Range-enabled)")
        httpd.serve_forever()
