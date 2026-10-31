<p align="center"><img src="images/logo.png" width="128" alt="pixel-art-with-ai logo"></p>

# pixel-art-with-ai

Claude Code skill for making pixel art with AI. It covers how to describe what you want, the steps from reference to finished sprite, and why you have to check every step.

## AI is not a painter

**AI CANNOT DRAW PIXEL ART FROM SCRATCH LIKE A PAINTER. IT ONLY WRITES CODE. SO DESCRIBE WHAT YOU WANT WITH SIMPLE SHAPES: SQUARE, CIRCLE, TRIANGLE.**

![Kinryu, drawn from scratch vs from a reference](images/kinryu_old_new.png)

Left: the AI drew the dragon from scratch. Right: the AI turned a reference image into pixels and moved it.

## Steps

![God, step by step](images/god_steps.png)

1. **Reference.** Find real images of what you want.
2. **Compose.** Have the AI put it together in code from those images.
3. **Rig.** Ask for bones so the parts can move.
4. **Pixelate.** Ask for pixel art and say how it should look, for example "realistic".
5. **Animate.** Look at the frames one by one.
6. **Put it in the scene.** Check it next to everything else.

![God animation](images/god.gif)

![God battle](images/god_battle.gif)

## Example: Kinryu

![Kinryu, step by step](images/kinryu_steps.png)

1. **Reference.** One still of a golden dragon.
2. **Pixelate.** Remove the background and turn it into pixels.
3. **Rig.** Find the spine from head to tail and move the body along it.
4. **Put it in the scene.** The dragon comes down from the sky, roars and breathes fire.

![Kinryu animation](images/kinryu.gif)

## Example: mini characters

![Mini characters](images/fighters.gif)

![Mini characters fighting](images/fighters_battle.gif)

## Rule: never "do this" and walk away

**NEVER TELL THE AI "DO THIS" AND LEAVE IT. CHECK IT THE WHOLE TIME IT WORKS AND MAKE SURE WHAT YOU GET IS WHAT YOU WANTED.**

![Heirs of the Valley, first version vs now](images/hotv_before_after.png)

After every step, look at the result:

- Is it the size you wanted?
- Does it look the way you described it?
- Is it the thing you asked for?

If something is wrong, say exactly what is wrong and run the step again. Move on only when the step is right.

## Install

```
git clone https://github.com/mankidev/pixel-art-with-ai ~/.claude/skills/pixel-art-with-ai
```

Claude Code loads it on the next start. It runs when you ask for sprites, icons or tiles.

## License

MIT
