/*
 * Reusable quiz widget.
 * Markup:
 *   <div class="quiz" data-answer="2" data-why="Explanation shown after answering.">
 *     <p class="q">Question?</p>
 *     <button>Option A</button><button>Option B</button><button>Option C</button>
 *   </div>
 * data-answer is the 0-based index of the correct button.
 * Also supports an ordering exercise:
 *   <div class="order" data-why="..."><p class="q">Put in order</p>
 *     <ul><li data-pos="2">…</li><li data-pos="0">…</li></ul></div>
 * Click items in the order you think is right; data-pos is the correct index.
 */
(function () {
  const style = document.createElement("style");
  style.textContent = `
    .quiz, .order { border: 1px solid var(--rule); border-radius: 8px; padding: 1rem 1.25rem; margin: 1.25rem 0; }
    .quiz .q, .order .q { margin: 0 0 0.75rem; font-weight: 600; }
    .quiz button, .order li {
      display: block; width: 100%; text-align: left; margin: 0.4rem 0; padding: 0.55rem 0.8rem;
      font: inherit; font-size: 0.95rem; color: var(--text); background: transparent;
      border: 1px solid var(--rule); border-radius: 6px; cursor: pointer; list-style: none;
      transition: border-color 150ms ease-out, background-color 150ms ease-out;
    }
    .quiz button:hover:not(:disabled), .order li:hover { border-color: var(--accent); }
    .quiz button:focus-visible, .order li:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .quiz button:disabled { cursor: default; }
    .quiz button.right, .order li.right { border-color: var(--ok); color: var(--ok); }
    .quiz button.wrong, .order li.wrong { border-color: var(--bad); color: var(--bad); }
    .order ul { padding: 0; margin: 0; }
    .order li[data-picked]::before { content: attr(data-picked) ". "; font-family: var(--mono); color: var(--muted); }
    .feedback { font-size: 0.92rem; margin: 0.6rem 0 0; color: var(--muted); }
    .feedback b { color: var(--text); }
    .retry { all: unset; cursor: pointer; color: var(--accent); text-decoration: underline; font-size: 0.9rem; }
    @media (prefers-reduced-motion: reduce) { .quiz button, .order li { transition: none; } }
  `;
  document.head.appendChild(style);

  function feedback(el, ok, why) {
    let f = el.querySelector(".feedback");
    if (!f) {
      f = document.createElement("p");
      f.className = "feedback";
      el.appendChild(f);
    }
    f.innerHTML = `<b>${ok ? "Correct." : "Not quite."}</b> ${why || ""}`;
    return f;
  }

  document.querySelectorAll(".quiz").forEach((quiz) => {
    const answer = Number(quiz.dataset.answer);
    const buttons = [...quiz.querySelectorAll("button")];
    buttons.forEach((b, i) => {
      b.type = "button";
      b.addEventListener("click", () => {
        buttons.forEach((x) => (x.disabled = true));
        buttons[answer].classList.add("right");
        if (i !== answer) b.classList.add("wrong");
        feedback(quiz, i === answer, quiz.dataset.why);
      });
    });
  });

  document.querySelectorAll(".order").forEach((ex) => {
    const items = [...ex.querySelectorAll("li")];
    let picks = [];
    const reset = () => {
      picks = [];
      items.forEach((li) => {
        li.removeAttribute("data-picked");
        li.classList.remove("right", "wrong");
      });
      ex.querySelector(".feedback")?.remove();
    };
    items.forEach((li) => {
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      const pick = () => {
        if (li.hasAttribute("data-picked") || picks.length === items.length) return;
        picks.push(li);
        li.setAttribute("data-picked", picks.length);
        if (picks.length === items.length) {
          let ok = true;
          picks.forEach((p, i) => {
            const good = Number(p.dataset.pos) === i;
            p.classList.add(good ? "right" : "wrong");
            if (!good) ok = false;
          });
          const f = feedback(ex, ok, ex.dataset.why);
          const r = document.createElement("button");
          r.className = "retry";
          r.textContent = "Try again";
          r.addEventListener("click", reset);
          f.append(" ", r);
        }
      };
      li.addEventListener("click", pick);
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pick();
        }
      });
    });
  });
})();
