import { h, render } from "preact";
import { useState } from "preact/hooks";

const App = () => {
  const [count] = useState(1);
  return h("div", null, `instantgram ${count}`);
};

render(h(App, null), document.body);
