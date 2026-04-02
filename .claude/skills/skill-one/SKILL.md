---
name: game-vfx-engine
description: Adds professional "game feel" and visual effects to existing JavaScript/Canvas code. Use this when the user asks to "polish," "add juice," or "improve visuals."
keywords: particles, screen shake, tweening, visual feedback, polish, game feel, animations
---

This skill provides the logic to inject high-quality visual feedback into a standard game loop.

### Capabilities:
1. **Particle System:** Generates lightweight, high-performance particle bursts for explosions, trails, or magic effects.
2. **Screen Shake:** Implements a non-destructive camera shake effect by manipulating the Canvas context transformation.
3. **Hit Flashes:** Adds a "flash white" effect to sprites or shapes when they take damage or interact.
4. **Smooth Interpolation (Lerp):** Replaces rigid movement with smooth, organic transitions using Linear Interpolation.

### Instructions for Agent:
- **Scan first:** Use `Read` to identify the `draw()` or `update()` loop in the user's code.
- **Inject:** Use `Edit` to add a `VFXManager` class or object to the file.
- **Integrate:** Ensure the `VFXManager.update()` is called inside the existing game loop.
- **Feedback:** When finished, tell the user: "I've added the VFX engine. You now have access to `triggerExplosion(x, y)` and `screenshake(intensity)`."

### Example Implementation:
When asked to "add juice to the collision," the agent should inject:
```javascript
// Example of the logic this skill should apply:
function screenShake(duration, intensity) {
    const start = Date.now();
    const loop = () => {
        const elapsed = Date.now() - start;
        if (elapsed < duration) {
            const dx = (Math.random() - 0.5) * intensity;
            const dy = (Math.random() - 0.5) * intensity;
            ctx.setTransform(1, 0, 0, 1, dx, dy);
            requestAnimationFrame(loop);
        } else {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
    };
    loop();
}