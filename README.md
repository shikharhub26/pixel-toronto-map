# Pixel Toronto Map

An open-source, pixel-inspired map of downtown Toronto. The map is intentionally stylized rather than GIS-accurate: it is meant to feel like a local town map that can support future event overlays.

## What is included

- Clickable downtown zones
- Expanded subzone boards
- Pixel-style landmark icons
- Lightweight static HTML/CSS/JavaScript
- JSON data files for zones and subzones

## Local preview

Serve the folder with any static server:

```sh
python3 -m http.server 5175 --bind 127.0.0.1
```

Then open:

```txt
http://127.0.0.1:5175
```

## Project direction

This repository is the reusable map foundation. Event-specific data, such as watch parties, screenings, venue lists, or festival overlays, should live in separate projects or data layers that build on top of this map.
