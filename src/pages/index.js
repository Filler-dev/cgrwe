import "../styles/global.css";
import "../components/icon/icon.js";
// The grid must be defined before the form, so that it is already listening
// when the form broadcasts its initial state.
import "../components/contrast-grid/contrast-grid.js";
import "../components/color-form/color-form.js";
import { qs } from "../shared/dom.js";
import { keepFeedbackLinkCurrent } from "./feedback.js";

const form = qs("cg-color-form");
form.start();

keepFeedbackLinkCurrent(qs(".cg-app__feedback"), form);
