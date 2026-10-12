import "./styles/project.css";
import "./components/icon/icon.js";
// The grid must be defined before the form, so that it is already listening
// when the form broadcasts its initial state.
import "./components/contrast_grid/contrast_grid.js";
import "./components/color_form/color_form.js";
import { qs } from "./scripts/dom.js";
import { feedbackHref } from "./scripts/feedback.js";

const form = qs("cg-color-form");
form.start();

// Kept current rather than set on click, as a middle click or the context menu fires no click.
const feedback = qs(".cg-app__feedback");
const updateFeedback = () => {
  form.syncUrl();
  feedback.href = feedbackHref(feedback.dataset.address, location.href);
};
updateFeedback();
for (const type of ["pointerenter", "focus", "click"]) {
  feedback.addEventListener(type, updateFeedback);
}
