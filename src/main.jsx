import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
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
const application = (
  <Boundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Boundary>
);

const root = document.getElementById("root");
if (root.firstElementChild) hydrateRoot(root, application);
else createRoot(root).render(application);
