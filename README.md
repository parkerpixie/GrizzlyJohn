# 🐻 GrizzlyJohn

**Still learning. Still wandering. Still here.**

A personal app for John: longtime sobriety, thoughtful reflections, good podcasts, tiny adventures, park memories, curiosity, humor, and one very gentle grizzly who looks a little suspiciously like Santa.

## Current MVP

The app is intentionally simple and mobile-first. No framework or build step is required yet.

### 🏕 Today
- Official AA Daily Reflection link
- Daily rotating Bear Wisdom card
- Daily Side Quest
- Optional “What are you carrying today?” note stored locally on the device

### 🐻 Wisdom
- Starter custom GrizzlyJohn reflection/oracle deck
- Random card draw
- Field-guide view of all current cards
- Each card includes a thought, a question, and a tiny practice

Starter cards include:
- The Grizzly
- The Campfire
- The Switchback
- The Detour
- The Bison
- The Raven
- The Moose
- The Turtle
- The Otter
- The Empty Chair
- The Weathered Map
- The Trailhead

### 🥾 Quest
- Random adult Side Quests across Outdoors, Curiosity, Recovery, People, and Wild Card categories
- Quest completion counter
- Trail-stamp milestones

### 🏞 Roam
- Simple personal park/place passport
- Visited and Want to Go statuses
- State count
- Optional memory field
- Stored locally on the device

### 🎧 Campfire Radio
Starter podcast shelf with links to Spotify, Apple Podcasts, and Amazon Music:
- The Mel Robbins Podcast
- How to Be a Better Human
- Ologies with Alie Ward
- MrBallen Podcast: Strange, Dark & Mysterious Stories
- Stuff You Should Know

Also includes a simple local Listening Log for saving thoughts that stick.

## Visual direction for the next pass

The current emoji artwork is deliberately temporary. Replace it with a custom GrizzlyJohn visual system:

- Gentle, slightly weathered grizzly mascot
- Santa-adjacent warmth, not cartoon kiddie-bear energy
- Vintage National Park / WPA poster influence
- Field journal and park-passport details
- Topographic lines, trail signs, stamps, patches, maps
- Forest green, cream, rust, muted gold, weathered brown
- Grizz should have expressive eyebrows and occasional reading glasses / ranger gear

Possible Grizz moments:
- Reading a reflection
- Holding a field journal
- Hiking with a pack
- Sitting beside a campfire
- Looking deeply unimpressed
- Holding binoculars or a park map
- Podcast headphones
- Tiny celebratory park stamp

## Future ideas

- Expand Bear Wisdom to 30–50 cards
- National + state park datasets and map view
- Photo uploads for park memories
- Better park passport stamps/badges
- Favorite podcast episodes and ratings
- Surface old saved listening thoughts on Today
- More personalized Side Quest categories
- Optional park/travel suggestions
- PWA installability
- Export/backup local data

## Files

- `index.html` — app structure
- `styles.css` — base visual system
- `data.js` — wisdom cards, quests, stamps, and podcast starter data
- `app.js` — navigation, randomization, logging, local storage, and passport behavior

## Tech note

All personal entries currently stay in browser `localStorage`. There is no account, backend, cloud sync, or personal-data collection in this first version.
