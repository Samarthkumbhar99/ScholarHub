#!/usr/bin/env python
"""Convenience script to execute on-demand scholarship discovery."""

import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.cli.collect import main

if __name__ == "__main__":
    main()
