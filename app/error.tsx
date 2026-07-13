"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="app-error">
      <section>
        <p>FounderReach</p>
        <h1>Something interrupted this view.</h1>
        <button onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
