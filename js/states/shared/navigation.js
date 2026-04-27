// Funcoes utilitarias para navegacao de menu e entrada de texto com cooldown.
export function updateDirectionalSelection({
  dt,
  input,
  cooldown,
  index,
  length,
  step = 0.16,
}) {
  let nextCooldown = Math.max(0, cooldown - dt);
  let nextIndex = index;

  if (nextCooldown > 0 || length <= 0) {
    return { cooldown: nextCooldown, index: nextIndex };
  }

  if (input.left || input.up) {
    nextIndex = (index - 1 + length) % length;
    nextCooldown = step;
  } else if (input.right || input.down) {
    nextIndex = (index + 1) % length;
    nextCooldown = step;
  }

  return { cooldown: nextCooldown, index: nextIndex };
}

export function applyTextInput({
  input,
  value,
  maxLength = 12,
  cooldown,
  step = 0.08,
}) {
  let nextValue = value;
  let nextCooldown = cooldown;

  if (input.backspace) {
    nextValue = value.slice(0, -1);
    nextCooldown = step;
    return { value: nextValue, cooldown: nextCooldown };
  }

  if (input.text && value.length < maxLength) {
    nextValue = `${value}${input.text.toUpperCase()}`;
    nextCooldown = step;
  }

  return { value: nextValue, cooldown: nextCooldown };
}