# Busly 🚍

**Your bus. Your stop. Your time.**

Busly is a smart, simple bus-stop assistant prototype built for a Level 3
entrepreneurship project. It helps a rider find the nearest stop, the right
bus, live-style arrival times, and get clear next steps — including a chat
assistant, "Buddy," that answers questions in plain language.

This build is localized to Cairo, Egypt (Tahrir Square, Ramses Station,
Zamalek, Nasr City, Maadi, City Stars Mall, Cairo Public Library, Cairo
Stadium) and uses a purple-and-white visual theme.

## Files

| File          | Purpose                                             |
|---------------|------------------------------------------------------|
| `index.html`  | Page structure and content                          |
| `style.css`   | All visual styling (design tokens, layout, animation)|
| `script.js`   | All interactivity: journey finder, arrivals, map, chatbot, geolocation, saved stops |
| `README.md`   | This file                                            |

## Running it

No build step and no backend required. Just open `index.html` in a modern
browser — either double-click the file, or serve the folder locally:

```bash
# from inside the project folder
python3 -m http.server 8000
# then visit http://localhost:8000
```

(A local server is only needed if your browser restricts `file://` access to
scripts — opening `index.html` directly usually works fine too.)

## Features

- **Journey finder** — type a destination or tap a popular-destination chip
  (School, Downtown Cairo, Cairo Public Library, City Stars Mall, Hospital,
  Cairo Stadium) to get a matched route, walking distance, and arrival time.
- **Use My Location** — requests browser geolocation, re-sorts nearby stops
  by distance, and gracefully falls back to manual entry if permission is
  denied or unavailable.
- **Nearest Stop card** — next bus, walking directions (simulated), stop
  details, and a Save Stop button backed by `localStorage`.
- **Live-style arrival board** — animated countdowns for 5 sample routes,
  clearly labeled as demo/prototype data.
- **Simulated interactive map** — SVG-based map showing your location,
  nearby stops, and the route to your destination.
- **Buddy, the chat assistant** — a floating chatbot (bottom-right) that
  understands a wide range of natural-language questions about stops,
  routes, delays, transfers, and directions, and still tries to be useful
  on off-topic questions rather than just refusing.
- **Accessibility** — keyboard-navigable, visible focus states, status is
  never conveyed by color alone, and animations respect
  `prefers-reduced-motion`.

## Honesty / data notice

All bus stops, routes, arrival times, and delays are realistic **sample
data** created for this prototype — not a live transit feed. This is called
out in the UI (the arrival board, the map, and Buddy all label it clearly).
A production version would replace the simulated data with a real transit
API.

## Entrepreneurship context

- **Problem** — Students and bus users can struggle to know their nearest
  stop, which bus to take, when it arrives, and what to do next.
- **User** — A student or everyday passenger who wants a quick, clear
  answer without digging through complicated transport information.
- **Solution** — A simple bus-stop assistant combining nearby stops, route
  matching, live-style arrivals, and a conversational helper.
- **Value** — Less confusion, less waiting uncertainty, easier journey
  planning from door to destination.

## Google Maps setup

The interactive map now uses Google Maps JavaScript API with Places API (New). The map search accepts a place/address, searches Google Places, centers the map on the result, and shows a styled purple/white marker and place card.

Before deploying, open `index.html` and replace `YOUR_GOOGLE_MAPS_API_KEY` with a browser-restricted Google Maps Platform API key. Enable **Maps JavaScript API** and **Places API (New)** for the key. Restrict the key to your GitHub Pages domain (for example `https://hazem-kk.github.io/*`) rather than leaving it unrestricted.

The bus-stop data remains prototype/sample data; Google Maps is used for the actual map and place search.
