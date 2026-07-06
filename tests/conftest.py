from __future__ import annotations

import os


os.environ.setdefault("API_DATA_SOURCE", "files")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
