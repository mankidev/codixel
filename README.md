<p align="center"><img src="images/logo.png" width="128" alt="Codixel logo"></p>

# Codixel

Claude Code skill for making pixel art with AI. It covers how to describe what you want, the steps from reference to finished sprite, and why you have to check every step.

## What to do

- [Remember AI is not a painter, it only writes code](#ai-is-not-a-painter)
- [Start from a real reference image](#example-kinryu)
- [Give a reference to compare with](#example-astral-prison)
- [Go step by step](#steps)
- [Ask for how it should look, like "realistic"](#example-ocean)
- [Build characters from only a few pixels](#example-mini-characters)
- [Find sounds on the internet, don't let the AI make them](#sound)
- [Never say "do this" or "copy this" and walk away, check every step](#never-do-this-or-copy-this-and-walk-away)

## AI is not a painter

**AI cannot draw pixel art from scratch like a painter. It only writes code.**

![Kinryu, drawn from scratch vs from a reference](images/kinryu_old_new.png)

Left: the AI drew the dragon from scratch. Right: the AI turned a reference image into pixels and moved it.

## Example: Kinryu

![Kinryu, step by step](images/kinryu_steps.png)

1. Start from one still of a golden dragon.
2. Remove the background and turn it into pixels.
3. Find the spine from head to tail and move the body along it.
4. Put it in the scene: the dragon comes down from the sky, roars and breathes fire.

![Kinryu animation](images/kinryu.gif)

## Example: Astral Prison

![Astral Prison, reference vs result](images/astral_prison.png)

Give the AI a reference to compare with. It understands much better what you want.

![Astral Prison animation](images/astral_prison.gif)

## Steps

![God, step by step](images/god_steps.png)

1. Find real images of what you want.
2. Have the AI put it together in code from those images.
3. Ask for bones so the parts can move.
4. Ask for pixel art and say how it should look, for example "realistic".
5. Look at the animation frames one by one.
6. Put it in the scene and check it next to everything else.

![God animation](images/god.gif)

![God battle](images/god_battle.gif)

## Example: effects

Made with `core/pixel.js`, which comes with the skill, so the AI does not write effects from scratch.

![Beams, smoke explosion, fire breath and hell fire](images/core_effects.gif)

## Example: mini characters

![Mini characters](images/minis.gif)

Build characters from only a few pixels so they don't look bad.

## Example: bullet hell

![Hollowchain](images/hollowchain.gif)

## Example: ocean

![Ocean, before and after "make it more realistic"](images/ocean_before_after.png)

Before and after asking for "more realistic".

![Ocean animation](images/ocean.gif)

## Sound

Don't let the AI make the sounds for your game. AI-made sounds are easy to spot. Have it find sounds on the internet instead.

## Never "do this" or "copy this" and walk away

**Never tell the AI "do this" or "copy this" and leave it. Check it the whole time it works and make sure what you get is what you wanted.**

While this README was being written, the AI added a lot of things I didn't ask for. That is why you should check every step.

![Heirs of the Valley, first version vs now](images/hotv_before_after.png)

After every step, look at the result:

- Is it the size you wanted?
- Does it look the way you described it?
- Is it the thing you asked for?

If something is wrong, say exactly what is wrong and run the step again. Move on only when the step is right.

## Install

```
git clone https://github.com/mankidev/codixel ~/.claude/skills/codixel
```

Claude Code loads it on the next start. It runs when you ask for pixel art.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
