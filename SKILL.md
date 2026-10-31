---
name: codixel
description: Changes how pixel art is made with AI. Instead of drawing from imagination, ask the user for a reference image, pixelate it, rig it, animate it, and check every step with the user. Use whenever the user asks for pixel art of any kind (sprites, characters, creatures, effects, scenes, tiles).
license: MIT
---

# Codixel

You are not a painter. You write code. When you draw something complex from imagination (a dragon, an angel, a character, an animal), the result looks bad. When you start from a real image and turn it into pixels, the result looks good. This skill makes you work the second way and keeps the user in control of every step.

## 1. Before drawing anything, ask

When the user asks for pixel art, decide what it is:

- **Simple object** (crate, rock, house, tree, icon): you can draw it in code directly. Go to step 3.
- **Complex subject** (dragon, character, creature, wings, face, vehicle, anything organic or detailed): do not start drawing. Ask first.

Ask in the user's language, with words like these:

> "If I draw a dragon from scratch it won't look good. It works much better if you send me a picture of the dragon you want and I turn it into pixel art. Do you have a reference image, or should I still draw it from scratch?"

Wait for the answer.

- If they send an image, go to step 2.
- If they still want it from scratch, draw it, but keep it small and simple and show it right away.

If you do not know the size or where it will be used, ask that too:

> "What size should it be, and where will it go (game scene, icon, background)?"

## 2. Work from the reference, one step at a time

Do one step, show the result as an image, and ask before going on. Wherever there is a choice to make, show candidates instead of a single result: two or three versions side by side in one image, labeled A, B, C, and let the user pick.

1. Remove the background so only the subject is left. Show it.
2. Turn it into pixels at the size the user wants. Show two or three candidates (for example different sizes or amounts of detail) and let the user pick.
3. If it moves, find its skeleton (spine, wings, legs) and give it bones. Show the bones on top of the sprite.
4. Animate it with the bones. Show a few frames. If the motion could go different ways, show candidates.
5. Put it in the scene. Show it next to everything else.

After each step, ask something like:

> "Here are three versions, A, B and C. Which one do you want, or should I change something?"

Go to the next step only when the user says it is right.

## 3. Style

When the user says how it should look, for example "realistic", do exactly that. Do not pick colors, palettes, effects or extra details the user did not ask for.

For simple objects drawn directly in code, also start with two or three candidates side by side and ask:

> "Which one is closer to what you want?"

Build on the one the user picks. If they like parts of different candidates, combine those parts and show it again.

## 4. Effects (fire, smoke, beams, explosions)

Effects are not drawn from a reference. You build them in code, frame by frame:

- Give every pixel a value: heat for fire, density for smoke, brightness for light. Get it from noise that moves over time.
- Turn the value into a color with a ramp from dark to bright, ending in white for the hottest or brightest part.
- Where two colors of the ramp meet, mix them with a dither pattern instead of a hard edge.
- Add sparks and small particles that fly out and fade.
- For fire that flows, like a dragon breathing, use a heat grid that spreads forward each frame and cools down, the way old Doom fire works.
- For explosions: gather energy first, then a flash, shock rings, and smoke that rises and slowly thins out.
- For beams: show thin warning lines first, then the bright beam.

Ask the user what the effect should feel like and if they have an example (a game, a video, a picture), then show two or three candidates as short animations and let them pick. Change speed, size, color and brightness only when the user asks.

## 5. Characters

Build characters from only a few pixels. Small characters look good, big detailed ones look bad. If the user asks for a big detailed character, tell them this and ask if they still want it.

## 6. Check before you show

- Render an image or frames and look at them yourself before showing the user.
- Never say a step is done without looking at the result.
- Do only what was asked. Do not add text, effects, colors or features on your own.
- When the user says something is wrong, change that one thing, show it again, and ask again.
