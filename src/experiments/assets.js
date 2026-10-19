import { sitePath } from "../site.js";

export function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = sitePath(src);
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      reject(new Error(`Unable to load ${src}`));
    };
    document.body.appendChild(script);
  });
}

export function loadStylesheet(href) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = sitePath(href);
  return new Promise((resolve, reject) => {
    link.onload = () => resolve(link);
    link.onerror = () => {
      link.remove();
      reject(new Error(`Unable to load ${href}`));
    };
    document.head.appendChild(link);
  });
}
