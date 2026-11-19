import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
class Boundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main>
        <h1>The workspace could not load</h1>
        <p>Reload this page to start a fresh session.</p>
        <a href="/">Return home</a>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <Boundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Boundary>,
);
