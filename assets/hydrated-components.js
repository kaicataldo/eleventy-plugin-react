import * as components from "./autogenerated-components-map";
import React from "react";
import ReactDOM from "react-dom";

for (const markerEl of document.querySelectorAll("[data-hydration-start-id")) {
  const id = markerEl.getAttribute("data-hydration-start-id");
  const { props, componentName } = window.__hydrationData[id];
  const endMarkerEl = document.querySelector(`[data-hydration-end-id="${id}"]`);
  const Component = components[componentName];

  const componentEls = [];
  let elToCheck = markerEl.nextElementSibling;

  while (elToCheck !== endMarkerEl) {
    componentEls.push(elToCheck);
    elToCheck = elToCheck.nextElementSibling;
  }

  endMarkerEl.remove();

  // Hydrate the Component in a separate container in case it has siblings.
  const containerEl = document.createElement("div");
  containerEl.append(...componentEls);
  ReactDOM.hydrate(<Component {...props} />, containerEl);
  markerEl.replaceWith(...containerEl.children);
  containerEl.remove();
}

delete window.__hydrationData;