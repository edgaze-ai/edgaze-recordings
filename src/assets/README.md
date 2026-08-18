# Assets

Drop photos, videos, and GIFs here. Scenes pull them by slot name.

```
src/assets/photos/01.jpg
src/assets/videos/01.mp4
src/assets/gifs/01.gif
```

Slots: `photos/01`–`04`, `videos/01`–`02`, `gifs/01`. Any other filename is a new slot.

`photos/01.svg` is an empty plate — drop `01.jpg` next to it and the photo wins.

In a scene:

```html
<div class="plate" data-asset="photos/01"><i></i></div>
```

```ts
plateIn(tl, stage.querySelector('[data-asset="photos/01"]')!, { at: 1200 });
```

Sizes: default 16:9. `data-size="full"` | `square` | `portrait`.

Do not commit large video. Photos and the SVG slots stay in git.
