# THE VALUE GAME // ART LAB
**Created and designed by Athena Quispe**  
[athenaquispe.com](https://athenaquispe.com)
An interactive, Y2K-inspired multiplayer art game developed for a high school visual arts lesson exploring contour, value, contrast, and fragmentation.

A retro, multiplayer classroom quiz for a **Fragmented Value Drawing** lesson. Six questions, 20 seconds each, live leaderboard, host controls, and a drawing-unlocked finale.

## Run locally

1. Install Node.js 18+ from https://nodejs.org
2. In a terminal, open this folder.
3. Run `npm install` and then `npm start`.
4. Open **http://localhost:3000** in your browser.
5. Click **Create Classroom**. The host gets a six-character room code.
6. Students visit the same website, enter the code and a nickname, and join.
7. The host starts, controls the reveal/next question, and projects their browser in Zoom or the classroom.

### Important for actual live play

`localhost` only works on your own computer. For students joining remotely, the server must be deployed at a publicly accessible HTTPS URL. A Node.js hosting service that supports **Socket.IO/WebSockets** (such as Render or Railway) can host this folder. Install command: `npm install`; start command: `npm start`.

Some hosting free tiers sleep when idle; test before class. All participants should join from the same deployed URL. Live deployment: The Value Game is hosted on Render. Participants can join classroom sessions using a room code and a nickname.

## What it does

- Host creates a room; students join with six-character codes.
- Questions run with a 20-second timer, and the host can reveal answers early.
- Correct answers earn 100 points plus a speed bonus (up to 95 additional points).
- Shared leaderboard updates live for all connected participants.
- Names and scores are stored **in memory only** and disappear when the host disconnects or the server restarts.
- Host clicks through questions and unlocks the final drawing prompt.
- Mobile-friendly student view; keyboard-friendly choices; reduced-motion support.

## Notes

This prototype does **not** include account creation, databases, anti-cheat measures, rejoin recovery, or persistence. Host disconnection closes the room; refreshes during play do not preserve points. It's designed for small classroom demonstrations and should be tested before use.

## Editing content and design

- Questions: `server.js`, `questions` array.
- Timing: `server.js`, `QUESTION_MS`.
- Colors: `public/style.css`, `:root` variables.
- Game interface: `public/index.html` and `public/app.js`.
- A standalone, offline solo preview is included as `solo-preview.html` (not a multiplayer session).

Recommended activity: show printed contour/value guides, play the six-question quiz (~3–5 minutes), then model a contour drawing, add vertical/horizontal ruler divisions, and shade each section with different values.

## Y2K soft-goth pixel-pet theme

Updated with lavender/pink window chrome, lime accents, and pixel cat and puppy mascots. The mascot artwork is included in `public/cat.svg` and `public/puppy.svg`; the offline preview embeds them so it works without internet. The theme is playful and gently gothic rather than horror-themed.

### Deployment walkthrough (Render example)

1. Make a GitHub repository containing the **contents** of `value-game` (including `package.json`, `server.js`, and `public`).
2. In Render, create a **Web Service** connected to that repository. Choose **Node** runtime, build command `npm install`, start command `npm start`.
3. When deployment succeeds, open the Render `https://...onrender.com` URL to host the game.
4. Students use that **same public URL** to join; you press **Create Classroom**, then share the generated six-character room code and launch the questions.
5. Use a phone and a second browser/private window to test host/student joining before class.

**Important:** hosting plans, sleep behavior, and pricing may change. This is a prototype without account verification, moderation or reconnection persistence. Do not use real full student names; use nicknames. Keep your browser connected for the duration of the session.

## MySpace / Placement Paradox visual revision

This edition is based on the earlier digital protest page's early-web appearance: Windows 98 beveled panes and blue title bars, checkerboard pink backdrops, Courier text, overdecorated MySpace-style profile elements, pixel pets, star dividers, and funny mood/status captions. The game remains six questions with the original host/student multiplayer code. Visual decorations are not extra controls or audio players.
