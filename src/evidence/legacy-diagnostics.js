export function measure(owner) {
  const provider = document.querySelector(`[data-fluent-owner="${owner}"]`);
  if (!provider) return null;
  const read = selector => {
    const element = provider.querySelector(selector);
    if (!element) return null;
    const css = getComputedStyle(element);
    return {
      width: css.width, height: css.height, minWidth: css.minWidth,
      paddingLeft: css.paddingLeft,
      background: css.backgroundColor, display: css.display,
      classes: Array.from(element.classList),
    };
  };
  const probe = document.querySelector(`[data-actor-probe="${owner}"]`);
  return {
    icon: read("[data-fluent-icon]"), primary: read("[data-fluent-primary]"),
    avatar: read("[data-fluent-avatar]"),
    avatarOverride: provider.querySelector("[data-avatar-override]") ? read("[data-avatar-override]") : null,
    probeWidth: probe ? getComputedStyle(probe).width : null,
    scoped: provider.classList.contains("demo-contact-scope"),
  };
}

