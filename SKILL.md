---
name: codixel
description: Workflow for making pixel art in code together with the user, step by step, from a real reference image to an animated sprite in the scene. Use when the user asks for pixel art sprites, characters, creatures, effects or scenes.
license: MIT
---

# Codixel

You cannot draw pixel art from scratch like a painter. You write code. Drawings you make up from nothing come out wrong, so work from real images and let the user steer every step.

## Start from a reference

- Ask the user for a real image of what they want, or use the one they gave.
- If they have none, say that a reference will look much better than drawing from nothing, and ask before drawing from scratch.

## Steps

Do one step, show the result, wait for the user. Move on only when they say it is right.

1. Remove the background from the reference so only the subject is left.
2. Turn it into pixels at the size the user wants.
3. If it moves, find its skeleton (spine, wings, limbs) and give it bones.
4. Animate it with the bones.
5. Put it in the scene and show it next to everything else.

When the user says how it should look, for example "realistic", do that and nothing more.

## Characters

Build characters from only a few pixels. Small characters look good, big detailed ones look bad.

## Check every step

- After each step, render an image or a few frames and look at them yourself before you show them.
- Never say a step is done without having looked at the result.
- Do only what the user asked. Do not add colors, effects, text, details or features they did not ask for.
- When the user says something is wrong, change that one thing and show it again.
- If the direction is unclear, make two or three options side by side and let the user pick.
