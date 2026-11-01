---
name: codixel
description: Changes how pixel art is made with AI. Instead of drawing from imagination, ask the user for a reference image, pixelate it, rig it, animate it, and check every step with the user. Use whenever the user asks for pixel art of any kind (sprites, characters, creatures, effects, scenes, tiles).
license: GPL-3.0-or-later
---

# Codixel

You are not a painter. You write code. When you draw something complex from imagination (a dragon, an angel, a character, an animal), the result looks bad. When you start from a real image and turn it into pixels, the result looks good. This skill makes you work the second way and keeps the user in control of every step.

## Showing an image

The terminal cannot show pictures. Every time this skill says "show", do this:

1. Save the result as a PNG with `P.save` (and a GIF with `P.gif` when it moves) in the user's project, or in a folder the user named.
2. Open the PNG yourself with the Read tool and look at it.
3. Give the user the full path of each file.

Read shows only the first frame of a GIF, so check motion on a numbered frame sheet, not on the GIF.

## Use the core, do not start from scratch

This skill comes with `core/pixel.js`, next to this file. Use it instead of writing image code or effects yourself. In Node: `const P = require("<skill folder>/core/pixel.js")`. In a browser, load it with a script tag and use the global `P`; draw a buffer on a canvas with `P.blit(buf, ctx, x, y)`. Loading and saving files only works in Node; in a browser `P.gif` returns a `Uint8Array`.

**Buffers.** `new P.Buf(w, h)` holds the pixels. `ox`, `oy` set the world offset: every drawing method takes world coordinates, so with `b.ox = -120; b.oy = -120` the point (0, 0) is 120 pixels in from the left and top. Methods: `pset`, `get`, `rect`, `line`, `poly`, `blob` (soft dithered circle), `ring`, `sprite`, `field(fn, palette)` (one value per pixel turned into a palette color with dither), `dither`, `scaled(n)`, `clear`.

**Images.** These work on whole buffers and return a new one:

- `P.load(file)` reads a PNG, `P.save(buf, file)` writes one. Other formats, and interlaced PNGs, must be converted to a plain PNG first with any tool you have (ImageMagick, ffmpeg, Python PIL).
- `P.removeBg(buf, { tol, color, seeds, flood, erode })` removes a plain background. It finds the background color from the image edges and fills inward from them. `tol` (default 48) is how far a color may be from the background and still count as background. `flood: false` also removes background color inside the subject (holes between legs). Soft edges leave a light or dark ring around the subject; `erode: 1` or `2` cuts that many pixels off the outer edge (also `P.erode(buf, n)`).
- `P.trim(buf, pad)`, `P.crop(buf, x, y, w, h)`, `P.bounds(buf)`.
- `P.resize(buf, w, h, { mode })` averages the pixels. Leave out `h` to keep the shape (`P.resize(buf, w, { mode: true })` works too). Pixels end up fully solid or fully clear. Averaging blurs small details like eyes into a gray spot; `mode: true` keeps the most common color in each cell instead, use it on an image you already quantized at full size.
- `P.quantize(buf, n, { palette })` cuts the colors down to `n`, or maps them to a palette you give. Returns `{ buf, palette }`.
- `P.cleanup(buf, { tol, keepLone })` removes single stray pixels. It keeps a lone pixel when its color is very different from its neighbors (an eye, a highlight). A pixel with no solid neighbor at all is removed unless `keepLone: true` (a spark floating free).
- `P.outline(buf, color, { corners })` adds a one pixel outline. The new buffer is 2 pixels wider and taller and everything moves 1 pixel right and down, so joint positions read before the outline are off by one after it.

**Bones.** For parts that turn at a joint (legs, arms, wings, head):

```js
const rig = new P.Rig(sprite)
  .bone("body", null, 32, 60, 8, 52)
  .bone("head", "body", 34, 22, 32, 4)
  .bind({ joint: 2, paint: { head: [[20, 0], [50, 0], [50, 26], [20, 26]] } });
const pose = { body: { a: 0, dy: -1 }, head: 0.2 };
rig.draw(buf, x, y, pose, { flip: false });
rig.drawBones(big, x * 4, y * 4, pose, { scale: 4 });

const grid = P.ruler(sprite, 6, { step: 8 });
rig.drawBones(grid, 0, 0, pose, { scale: 6 });
```

`bone(name, parent, x, y, endX, endY, z)` takes the joint and the tip in sprite pixels. Parents come before children. `bind` gives every pixel to its nearest bone; `paint` gives the pixels inside a polygon to a bone instead, use it when the nearest bone is wrong. `joint` is how wide the overlap along the seams is, so no gaps open when parts turn. A pose gives each bone an angle in radians, or `{ a, dx, dy }`.

Do not guess where the joints are. `P.ruler(sprite, scale, { step })` scales the sprite up with numbered grid lines every `step` sprite pixels, so you can read the joint and tip coordinates off the image. Its world offset is set so `rig.drawBones(grid, 0, 0, pose, { scale })` lands on the sprite.

Check which pixels belong to which bone before animating. `rig.ownerMap()` returns the sprite tinted with each bone's color (joint overlap is tinted lighter), and `rig.legend()` lists the bone names next to their colors:

```js
const own = P.ruler(rig.ownerMap(), 6, { step: 8 });
rig.drawBones(own, 0, 0, {}, { scale: 6 });
P.save(P.sheet([own, rig.legend()]), "owners.png");
```

A wrong area (a shoulder tinted like the head) shows up here, not after the animation. Fix it with `paint` in `bind` and show it again.

**Long bodies.** For things that curve along a spine (snake, dragon, tail, tentacle): `P.bend(buf, sprite, rest, pose)`. `rest` is the spine as points in sprite pixels, `pose` is the same number of points where the spine should be now. `P.wave(points, t, amp, length, { from })` gives a moving wave along a spine; the wave is still at the start (`from`) and strongest at the end.

**Showing work.**

- `P.sheet(items, { cols, scale, fit, gap })` puts several buffers in one image with labels above them. An item is a buffer or `{ buf, label, scale }`. `fit: 192` scales each one to about 192 pixels high. Clear pixels show as a checker.
- `P.text(buf, x, y, "A", color, scale)` writes letters, numbers and `- . : / + ( ) #`.
- `P.gif(frames, { delay, scale, loop })` returns an animated GIF. `delay` is in milliseconds, one number or a list.
- `P.pack(frames, { cols, pad })` puts frames of the same size in a grid on a clear background, with no labels and no checker. This is the sprite sheet for the game; `P.sheet` is only for showing. The result has `frame` with `w`, `h`, `cols`, `rows`, `count`.

**Color and motion.** `P.palette(cols, n)`, `P.ramp`, `P.mix`, `P.ditherIndex`, `P.noise`, `P.fbm`, `P.rng(seed)`, `P.ease`.

**Effects.** These are taken from finished games. Change colors, sizes and timing to fit the request, but keep the method.

- `P.novaSmoke(buf, x, te, t, { front, fade, cols, scale })`: big smoke explosion with gathering, light column, shock rings, rising dome and smoke clouds. Call it with `front: false` before drawing the subject and `front: true` after. Ground is at y = 0, up is negative. `te` is the time since the eruption. At `scale: 1` it is about 480 pixels wide and 200 high; use `scale` to fit the scene.
- `new P.Breath({ length, cols })`: fire breath from a mouth. Call `step(on, steps)` every frame and `draw(buf, hx, hy, aA, aB, t, open, floor)` to draw it from the mouth at (`hx`, `hy`) between the angles `aA` and `aB`. Angles are in radians, 0 points right and positive turns down. `open` 0 to 1 sets how wide the cone opens. Nothing is drawn below the y of `floor` (by default the buffer's bottom); set it to the ground so the fire does not go through it. With `step(true, 3)` it reaches full length after about 50 frames.
- `new P.HellFire(w, h, { cols })`: wall of fire rising from the bottom. Call `step(power, cool, steps)` every frame (`power` 0 to 1 feeds the bottom row, `cool` 1 to 3 makes it shorter) and `draw(buf, x, ground)`, where `x` is the left edge and `ground` the y of the bottom (by default the buffer's left and bottom).
- `P.volley(t0, n, { w, h, safe, width })` and `P.beams(buf, list, t, cols)`: thin blinking warning lines, then bright beams with bloom and a screen flash.

For timing, pass a slower or faster time to the effect (for example `te * 0.5`).

The default colors (green smoke, gold breath, red fire) are only there so the effects run. Always pass `cols` that fit the request. If the request does not say a color, ask.

## 1. Before drawing anything, ask

When the user asks for pixel art, decide what it is:

- **Simple object** (crate, rock, house, tree, icon): you can draw it in code directly. Go to section 3 (Style).
- **Complex subject** (dragon, character, creature, wings, face, vehicle, anything organic or detailed): do not start drawing. Ask first.

Ask in the user's language, with words like these:

> "If I draw a dragon from scratch it won't look good. It works much better if you send me a picture of the dragon you want and I turn it into pixel art. Do you have a reference image, or should I still draw it from scratch?"

Wait for the answer.

- If they send an image, go to section 2.
- If they still want it from scratch, draw it, but keep it small and simple and show it right away.

If you do not know the size or where it will be used, ask that too:

> "What size should it be, and where will it go (game scene, icon, background)?"

**Where the reference comes from.** If the user's own photo or drawing, or an image with a license that allows it (public domain, CC0, CC BY), there is nothing to ask. If it looks like someone else's artwork and the result will be published or sold, say so once:

> "This looks like someone else's art. If the game will be published, you need their permission, or we can use it only for the pose and colors, or find a free image like it."

Then do what the user decides.

**If the user wants it fast.** When they say to skip the questions, do all the steps in one go and show one sheet with every step on it, then ask what to change.

## 2. Work from the reference, one step at a time

Do one step, show the result as an image, and ask before going on. Wherever there is a choice to make, show candidates instead of a single result: two or three versions side by side in one image, labeled A, B, C, and let the user pick. Use `P.sheet` for this, with the reference as the first item.

1. **Remove the background** so only the subject is left. Skip this if the image already has a clear background. `P.removeBg` works when the background is one plain color; if a ring of the old background stays around the edge, add `erode: 1` or `2`. If the edges are busy (a photo, a scene), ask the user for a version with a clear background, or use a background removal tool if one is installed (for example rembg). Then `P.trim`. Show it.
2. **Turn it into pixels** at the size the user wants: `P.resize`, then `P.quantize`, then `P.cleanup`. If small details like eyes turn into gray spots, quantize at full size first and then `P.resize` with `mode: true`. Show two or three candidates, for example different widths (32, 48, 64) or color counts (8, 12, 16), and let the user pick. Add an outline with `P.outline` only if the user asks for one, and add it to the finished frames, after the bones.
3. **If it moves, give it bones.** Use `P.Rig` for parts that turn at a joint and `P.bend` for long bodies. Read the joint positions off `P.ruler` and show the bones on top of it with `rig.drawBones` at the same scale. Then show `rig.ownerMap()` with `rig.legend()` and fix wrong areas before animating.
   Turning a small pixel sprite gives jagged edges and broken lines, more so at big angles. If the sprite is small (under about 64 pixels) or the parts must turn far, give the bones to the clean full-size image instead and turn each frame into pixels afterwards, the way it is done for several images below. When unsure, show both ways as candidates.
4. **Animate it with the bones.** Move with `P.ease` curves so motion speeds up and slows down instead of moving at one speed. Show the frames as a numbered sheet. You cannot see a GIF move, so look at the sheet yourself, and give the user a GIF from `P.gif` so they can see the motion. If the motion could go different ways, show candidates.
5. **Put it in the scene.** Show it next to everything else.
6. **Save it for the game.** Draw every frame into a buffer of the same size, put them together with `P.pack`, and save the PNG. Tell the user the frame size, the number of frames, the columns and the delay. If the game wants one file per frame, save each frame with `P.save` instead.

**When the subject is put together from several images** (wings from one picture, a body from another), put the parts together and give them bones at full size first, then turn each frame into pixels. Quantize the first frame at full size, then pass its palette to `P.quantize` for every other frame so the colors stay the same, and shrink each frame with `P.resize` and `mode: true`.

After each step, ask something like:

> "Here are three versions, A, B and C. Which one do you want, or should I change something?"

Go to the next step only when the user says it is right.

## 3. Style

When the user says how it should look, for example "realistic", do exactly that. Do not pick colors, palettes, effects or extra details the user did not ask for.

For any soft change between colors (a sky, shading on a round shape, smoke, fire), keep each color as a flat band and mix only a thin strip where two bands meet, with `P.field` or `P.ditherIndex`. Do not dither the whole area, and do not use a smooth gradient with many colors.

For simple objects drawn directly in code, also start with two or three candidates side by side and ask:

> "Which one is closer to what you want?"

Build on the one the user picks. If they like parts of different candidates, combine those parts and show it again.

## 4. Effects (fire, smoke, beams, explosions)

Effects are not drawn from a reference. You build them in code, frame by frame. Start from the effects in `core/pixel.js` when one fits:

- Give every pixel a value: heat for fire, density for smoke, brightness for light. Get it from noise that moves over time.
- Turn the value into a color with a ramp from dark to bright, ending in white for the hottest or brightest part.
- Where two colors of the ramp meet, mix them with a dither pattern instead of a hard edge.
- Add sparks and small particles that fly out and fade.
- For fire that flows, like a dragon breathing, use a heat grid that spreads forward each frame and cools down, the way old Doom fire works.
- For explosions: gather energy first, then a flash, shock rings, and smoke that rises and slowly thins out.
- For beams: show thin warning lines first, then the bright beam.

Ask the user what the effect should feel like and if they have an example (a game, a video, a picture), then show two or three candidates as short animations and let them pick. Change speed, size, color and brightness only when the user asks.

## 5. Characters drawn from scratch

When there is no reference, build characters from only a few pixels. Small characters drawn from scratch look good, big detailed ones look bad. If the user asks for a big detailed character without a reference, tell them this and ask for a reference, or ask if they still want it. Big detailed subjects are fine when they come from a reference.

## 6. Check before you show

- Render an image or frames and look at them yourself before showing the user.
- Never say a step is done without looking at the result.
- Do only what was asked. Do not add text, effects, colors or features on your own.
- When the user says something is wrong, change that one thing, show it again, and ask again.
