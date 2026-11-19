import React, { Suspense, lazy, useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import {
  Aperture,
  Image,
  Layers,
  FileImage,
  Minimize2,
  Scaling,
  Crop,
  RotateCw,
  Files,
  Stamp,
  Braces,
  Search,
  Moon,
  Sun,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { tools, pages, generalFaq } from "./catalog.js";
import css from "./style.module.css";
const Workspace = lazy(() => import("./Workspace.jsx"));
const icons = [
  Image,
  Layers,
  FileImage,
  Minimize2,
  Scaling,
  Crop,
  RotateCw,
  Files,
  Stamp,
  Braces,
];
function Icon({ tool }) {
  const Glyph = icons[tools.indexOf(tool)];
  return (
    <span className={css.icon} data-color={tool.category}>
      <Glyph size={24} />
    </span>
  );
}
function Brand() {
  return (
    <Link className={css.brand} to="/">
      <Aperture size={32} />
      PixelPress
    </Link>
  );
}
function Header() {
  const [dark, setDark] = useState(false),
    [open, setOpen] = useState(false);
  useEffect(() => {
    let v = matchMedia("(prefers-color-scheme: dark)").matches;
    try {
      const saved = localStorage.getItem("theme");
      if (saved) v = saved === "dark";
    } catch {}
    setDark(v);
    document.documentElement.dataset.theme = v ? "dark" : "light";
  }, []);
  return (
    <header>
      <div className={css.nav}>
        <Brand />
        <button
          className={css.mobile}
          aria-label="Navigation menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? css.open : ""} onClick={() => setOpen(false)}>
          <a href="/#directory">Tools</a>
          <Link to="/about">About</Link>
          <a href="/#faq">FAQ</a>
        </nav>
        <button
          className={css.round}
          aria-label="Toggle dark theme"
          aria-pressed={dark}
          onClick={() => {
            setDark(!dark);
            document.documentElement.dataset.theme = dark ? "light" : "dark";
            try {
              localStorage.setItem("theme", dark ? "light" : "dark");
            } catch {}
          }}
        >
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
      </div>
    </header>
  );
}
function Faq({ list }) {
  return (
    <div className={css.faq}>
      {list.map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
function Cards({ items }) {
  return (
    <div className={css.grid}>
      {items.map((t) => (
        <Link className={css.card} key={t.id} to={t.path}>
          <Icon tool={t} />
          <h3>{t.name}</h3>
          <p>{t.description}</p>
        </Link>
      ))}
    </div>
  );
}
function Home() {
  const [query, search] = useState(""),
    [category, filter] = useState("All");
  const found = tools.filter(
    (t) =>
      (category === "All" || category === t.category) &&
      (t.name + " " + t.description)
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <section className={css.hero}>
        <div>
          <h1>
            Free Online
            <br />
            Image Tools <span>— Fast, Simple &amp; Secure</span>
          </h1>
          <p>
            Convert, compress, and edit your images right in your browser. Your
            files stay on your device.
          </p>
          <form
            className={css.search}
            onSubmit={(e) => {
              e.preventDefault();
              document.getElementById("directory").scrollIntoView();
            }}
          >
            <Search />
            <input
              aria-label="Search image tools"
              type="search"
              placeholder="Search image tools…"
              value={query}
              onChange={(e) => search(e.target.value)}
            />
            <button>Search</button>
          </form>
        </div>
        <div className={css.art} aria-hidden="true">
          <div className={css.sheet}>
            <div className={css.poster}>
              <i />
              <b />
              <em />
            </div>
            <strong>PixelPress</strong>
            <small>IMAGE STUDIO</small>
          </div>
        </div>
      </section>
      <section>
        <h2>Popular tools</h2>
        <div className={css.popular}>
          {[tools[3], tools[0], tools[4], tools[7]].map((t) => (
            <Link key={t.id} to={t.path}>
              <Icon tool={t} />
              {t.name}
            </Link>
          ))}
        </div>
      </section>
      <section id="directory">
        <h2>All image tools</h2>
        <div className={css.filters}>
          {["All", "Convert", "Optimize", "Edit"].map((c) => (
            <button
              aria-pressed={category === c}
              key={c}
              onClick={() => filter(c)}
            >
              {c === "All" ? "All tools" : c}
            </button>
          ))}
        </div>
        {query && (
          <p aria-live="polite">
            {found.length} matches for “{query}”{" "}
            <button onClick={() => search("")}>Clear search</button>
          </p>
        )}
        <Cards items={found} />
        {!found.length && <p>Try a format like PNG or a task like resize.</p>}
      </section>
      <section className={css.info}>
        <div>
          <h2>How it works</h2>
          <ol>
            <li>Choose a tool and add your image.</li>
            <li>Adjust the settings and preview your result.</li>
            <li>Download a new file. Your original stays intact.</li>
          </ol>
        </div>
        <div>
          <ShieldCheck />
          <h2>Private by design</h2>
          <p>
            Your browser does the processing. PixelPress has no image upload
            server or account requirement.
          </p>
        </div>
      </section>
      <section id="faq">
        <h2>Frequently asked questions</h2>
        <Faq list={generalFaq} />
      </section>
    </>
  );
}
function Tool({ t }) {
  return (
    <section>
      <Link to="/#directory">All tools</Link>
      <div className={css.toolHead}>
        <Icon tool={t} />
        <h1>{t.name}</h1>
        <p>{t.description}</p>
      </div>
      <Suspense fallback={<p>Loading workspace…</p>}>
        <Workspace key={t.id} id={t.id} />
      </Suspense>
      <section>
        <h2>Using {t.name}</h2>
        <Faq list={t.faq} />
      </section>
      <section>
        <h2>Related tools</h2>
        <Cards
          items={[
            ...tools.filter((x) => x !== t && x.category === t.category),
            ...tools.filter((x) => x.category !== t.category),
          ].slice(0, 3)}
        />
      </section>
    </section>
  );
}
function Info({ id }) {
  return (
    <section className={css.article}>
      <h1>{pages[id][0]}</h1>
      <p>{pages[id][1]}</p>
      {id === "contact" && (
        <a href="https://github.com/kalam1010hj-art/PixelPress/issues">
          Open the project issue tracker
        </a>
      )}
      {id === "sitemap" && (
        <ul>
          {[
            ["/", "Home"],
            ...tools.map((t) => [t.path, t.name]),
            ...Object.entries(pages).map(([k, v]) => ["/" + k, v[0]]),
          ].map(([path, name]) => (
            <li key={path}>
              <Link to={path}>{name}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
export function AdPlacement({ approved = false, consent = false, children }) {
  return (
    <div
      className={css.ad}
      aria-label={approved && consent ? "Advertisement" : undefined}
    >
      {approved && consent ? children : null}
    </div>
  );
}
function Sync() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const t = tools.find((t) => t.path === pathname);
    const name =
      t?.name ||
      pages[pathname.slice(1)]?.[0] ||
      (pathname === "/" ? "Free Online Image Tools" : "Page not found");
    document.title = name + " | PixelPress";
    const description = t?.description || pages[pathname.slice(1)]?.[1] || 'Convert, edit and optimize images locally with ten free browser tools.';
    const canonical = document.querySelector('link[rel="canonical"]');
    const url = new URL(pathname,canonical?.href || location.origin).href;
    if(canonical) canonical.href=url;
    for(const [selector,value] of [
      ['meta[name="description"]',description], ['meta[property="og:title"]',document.title],
      ['meta[property="og:description"]',description], ['meta[property="og:url"]',url]
    ]) document.querySelector(selector)?.setAttribute('content',value);
    const structured=document.querySelector('script[type="application/ld+json"]');
    if(structured) structured.textContent=JSON.stringify({'@context':'https://schema.org','@type':t?'WebApplication':'WebPage',name,url,description,...(t?{applicationCategory:'MultimediaApplication',operatingSystem:'Web'}:{})});

    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
export default function App() {
  return (
    <>
      <a className={css.skip} href="#main">
        Skip to content
      </a>
      <Header />
      <Sync />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          {tools.map((t) => (
            <Route key={t.id} path={t.path} element={<Tool t={t} />} />
          ))}
          {Object.keys(pages).map((id) => (
            <Route key={id} path={"/" + id} element={<Info id={id} />} />
          ))}
          <Route
            path="*"
            element={
              <section>
                <h1>Page not found</h1>
                <Link to="/">Browse image tools</Link>
              </section>
            }
          />
        </Routes>
      </main>
      <AdPlacement />
      <footer>
        <div>
          <Brand />
          <nav>
            {["privacy", "terms", "contact", "sitemap"].map((k) => (
              <Link key={k} to={"/" + k}>
                {pages[k][0]}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </>
  );
}
