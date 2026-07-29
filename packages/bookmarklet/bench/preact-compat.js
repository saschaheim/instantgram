import React from "preact/compat";
import { render } from "preact";

const App = () => React.createElement("div", null, "instantgram");

render(React.createElement(App, null), document.body);
