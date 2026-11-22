# GORE TOWN — Update 1.2

The whole game is one self-contained HTML file: ragdoll physics, dismemberment and organ gore, thousands of guns and props, 434 deployments, ElevenLabs audio. No install, no server, no external assets.

## Play

https://njjjjjhij.github.io/gore-town/

## Download

- [index.html](https://github.com/njjjjjhij/gore-town/blob/main/index.html) — use the download button, or open the raw file and save it (3.4 MB)
- [logo.png](https://github.com/njjjjjhij/gore-town/blob/main/logo.png) — game logo, 1024 x 1024

The downloaded file runs offline by opening it in any modern browser. Touch controls switch on from the title screen (TOUCH) and are laid out for two thumbs: floating move pad on the left, fire/aim cluster on the right, and AIM latches on tap.

## Build

```
node build.mjs
```

`build.mjs` inlines `vendor/three.module.js`, every module in `src/` (sorted by name) and the generated material maps and audio in `assets/` into `index.html`. Do not edit `index.html` by hand.
