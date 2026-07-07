"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./page.module.css";

const TAGLINES = [
  "Hot bytes. Cold cache. One potato.",
  "Your media, peeled and served at edge speed.",
  "Not a cloud. A tuber with ambitions.",
  "404? This potato only serves 200s.",
];

export default function HomePage() {
  const [tagline, setTagline] = useState(TAGLINES[0]);
  const [ripe, setRipe] = useState<"checking" | "ripe" | "raw">("checking");
  const [spins, setSpins] = useState(0);
  const [wiggle, setWiggle] = useState(false);

  useEffect(() => {
    setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
    fetch("https://cdn.anants.studio/assets/anant.png", { method: "HEAD" })
      .then((r) => setRipe(r.ok ? "ripe" : "raw"))
      .catch(() => setRipe("raw"));
  }, []);

  function pokePotato() {
    setWiggle(true);
    setSpins((n) => n + 1);
    setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
    window.setTimeout(() => setWiggle(false), 400);
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <ThemeToggle />
      </div>
      <main className={styles.main}>
        <div className={styles.status}>
          <span className={`${styles.dot} ${styles[ripe]}`} />
          <span className={styles.statusText}>
            {ripe === "checking" && "Checking tuber…"}
            {ripe === "ripe" && "CDN is ripe"}
            {ripe === "raw" && "CDN is still cooking"}
          </span>
        </div>

        <button
          type="button"
          className={`${styles.potato} ${wiggle ? styles.wiggle : ""}`}
          onClick={pokePotato}
          aria-label="Poke the potato"
        >
          🥔
        </button>

        <h1 className={styles.title}>anants-cdn</h1>
        <p className={styles.tagline}>{tagline}</p>

        <p className={styles.copy}>
          Public media CDN for{" "}
          <a href="https://anants.studio" target="_blank" rel="noreferrer">
            anants.studio
          </a>
          .
        </p>

        <div className={styles.urls}>
          <code className={styles.code}>
            cdn.anants.studio/assets/anant.png
          </code>
          <code className={styles.code}>
            cdn.anants.studio/media/images/placeholder.svg
          </code>
        </div>

        {spins >= 5 && (
          <Link href="/potato" className={styles.secret}>
            You found the potato cellar →
          </Link>
        )}
      </main>

      <footer className={styles.footer}>
        <span>🥔</span>
        <span>pin your tags</span>
        <span>never @main</span>
      </footer>
    </div>
  );
}
