<p align="center"><img src="images/logo.png" width="128" alt="pixel-art-with-ai logo"></p>

# pixel-art-with-ai

Claude Code skill for making pixel art with AI. It covers how to describe what you want, the steps from reference to finished sprite, and why you have to check every step.

![Heirs of the Valley, first look vs now](images/hotv_before_after.png)

## AI is not a painter

**AI CANNOT DRAW PIXEL ART FROM SCRATCH LIKE A PAINTER. IT ONLY WRITES CODE. SO DESCRIBE WHAT YOU WANT WITH SIMPLE SHAPES: SQUARE, CIRCLE, TRIANGLE.**

![Describe it with simple shapes](images/shapes.png)

A castle is a square with four cones on the corners and a triangle roof in the middle. Get the shapes right first, then ask for colors, shading and small details.

## Steps

![God, step by step](images/god_steps.png)

1. **Reference.** Collect a few real images of what you want.
2. **Compose.** Have the AI place the parts in code at full size.
3. **Rig.** Give moving parts simple bones so they can be posed.
4. **Pixelate.** Bring it down to the real size with a few colors per material, flat bands and a narrow dither where two bands meet.
5. **Animate.** Make the frames and look at them one by one.
6. **Put it in the scene.** Check it next to everything else, at the real size.

![God animation](images/god.gif)

## Example: Kinryu

![Kinryu, step by step](images/kinryu_steps.png)

1. **Reference.** One still of a golden dragon.
2. **Pixelate.** Remove the background and cut the colors down to a bright gold palette.
3. **Rig.** Find the spine from head to tail and bind every pixel to it.
4. **Put it in the scene.** The dragon comes down from the sky, roars and breathes fire.

## Rule: never "do this" and walk away

**NEVER TELL THE AI "DO THIS" AND LEAVE IT. CHECK IT THE WHOLE TIME IT WORKS AND MAKE SURE WHAT YOU GET IS WHAT YOU WANTED.**

![Check every step](images/check.png)

After every step, look at the result:

- Is it at the right size, on the pixel grid?
- Are the colors the palette you asked for?
- Is it the thing you asked for, in the style you asked for?

If something is wrong, say exactly what is wrong and run the step again. Move on only when the step is right.

## Install

```
git clone https://github.com/mankidev/pixel-art-with-ai ~/.claude/skills/pixel-art-with-ai
```

Claude Code loads it on the next start. It runs when you ask for sprites, icons or tiles.

## License

MIT
