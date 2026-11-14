"use client";

// PROTOTYPE (menu-hover): throwaway hover-interaction explorer for the ride menu bar.
// Nothing in production imports this. Delete the whole folder once a variant is picked.
import "./proto.css";
import {
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CabinMap,
  CabinScreen,
  TroubleshootSheet,
  useCabinScreen,
} from "@/components/features/cabin-screen";
import { BottomSheet, MenuBar, SupportButton } from "@/components/ui";

const VARIANTS = [
  { key: "current", name: "Current" },
  { key: "glide", name: "Glide" },
  { key: "spotlight", name: "Spotlight" },
  { key: "lift", name: "Lift" },
] as const;
type VariantKey = (typeof VARIANTS)[number]["key"];

/* ---------- Icons (copied from RideMenu so the bar matches production) ---------- */

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["size-8", className].filter(Boolean).join(" ")}
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["size-8", className].filter(Boolean).join(" ")}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/* ---------- Glide: shared highlight that follows the pointer ---------- */

function useGlide(enabled: boolean) {
  const barRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLSpanElement>(null);
  const visible = useRef(false);

  const moveTo = useCallback(
    (target: EventTarget | null) => {
      const hl = hlRef.current;
      if (!enabled || !hl || !(target instanceof HTMLElement)) return;
      const el = target.closest<HTMLElement>(".proto-item");
      if (!el) return;
      // Coming from outside the bar: appear in place, don't slide from the last spot.
      if (!visible.current) hl.setAttribute("data-instant", "");
      hl.style.width = `${el.offsetWidth}px`;
      hl.style.height = `${el.offsetHeight}px`;
      hl.style.transform = `translate(${el.offsetLeft}px, ${el.offsetTop}px)`;
      if (!visible.current) {
        void hl.offsetWidth; // commit the jump before re-enabling the slide
        hl.removeAttribute("data-instant");
      }
      hl.setAttribute("data-visible", "");
      visible.current = true;
    },
    [enabled],
  );

  const hide = useCallback(() => {
    hlRef.current?.removeAttribute("data-visible");
    hlRef.current?.removeAttribute("data-pressed");
    visible.current = false;
  }, []);

  const setPressed = useCallback((pressed: boolean) => {
    hlRef.current?.toggleAttribute("data-pressed", pressed);
  }, []);

  const itemProps = enabled
    ? {
        onHoverStart: (e: { target: EventTarget }) => moveTo(e.target),
        onPressStart: () => setPressed(true),
        onPressEnd: () => setPressed(false),
      }
    : {};

  return { barRef, hlRef, hide, itemProps };
}

/* ---------- The bar, rendered per variant ---------- */

function Content({ variant, children }: { variant: VariantKey; children: ReactNode }) {
  return variant === "lift" ? <span className="lift-content">{children}</span> : <>{children}</>;
}

function HoverMenu({ variant }: { variant: VariantKey }) {
  const { state, actions } = useCabinScreen();
  const { barRef, hlRef, hide, itemProps } = useGlide(variant === "glide");
  const lift = variant === "lift";

  return (
    <div
      data-variant={variant}
      className="absolute inset-x-0 bottom-12 flex flex-col items-end gap-4 px-12"
    >
      <SupportButton className="menu-support" />
      <div ref={barRef} onPointerLeave={hide}>
        <MenuBar aria-label="Ride controls" className="proto-bar relative">
          {variant === "glide" && <span ref={hlRef} aria-hidden className="glide-highlight" />}
          <MenuBar.Toggle className="proto-item" {...itemProps}>
            {({ isSelected }) => (
              <Content variant={variant}>
                <MusicIcon className={lift ? "lift-icon" : undefined} />
                {isSelected ? "Pause music" : "Play music"}
              </Content>
            )}
          </MenuBar.Toggle>
          <MenuBar.Separator />
          <MenuBar.Item
            aria-label="Climate, 70 degrees"
            className="proto-item tabular-nums"
            {...itemProps}
          >
            <Content variant={variant}>70°</Content>
          </MenuBar.Item>
          <MenuBar.Separator />
          <MenuBar.Item
            className="proto-item"
            onPress={state.driving ? actions.pullOver : actions.resume}
            {...itemProps}
          >
            <Content variant={variant}>{state.driving ? "Pull over" : "Resume ride"}</Content>
          </MenuBar.Item>
          <MenuBar.Separator />
          <BottomSheet>
            <MenuBar.Item className="proto-item" {...itemProps}>
              <Content variant={variant}>
                <QuestionIcon className={lift ? "lift-icon" : undefined} />
                Troubleshoot
              </Content>
            </MenuBar.Item>
            <TroubleshootSheet />
          </BottomSheet>
        </MenuBar>
      </div>
    </div>
  );
}

/* ---------- Picker (PICKER.md behavior contract) ---------- */

function Picker({ current, onSelect }: { current: number; onSelect: (i: number) => void }) {
  const navRef = useRef<HTMLElement>(null);
  const hlRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const moveHighlight = useCallback(() => {
    const el = itemRefs.current[current];
    const hl = hlRef.current;
    if (!el || !hl) return;
    hl.style.width = `${el.offsetWidth}px`;
    hl.style.transform = `translateX(${el.offsetLeft}px)`;
  }, [current]);

  useLayoutEffect(() => {
    moveHighlight();
  }, [moveHighlight]);

  useEffect(() => {
    window.addEventListener("resize", moveHighlight);
    return () => window.removeEventListener("resize", moveHighlight);
  }, [moveHighlight]);

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => navRef.current?.setAttribute("data-ready", "")),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <nav ref={navRef} className="proto-picker" data-position="top" aria-label="Prototype variants">
      <span ref={hlRef} className="proto-picker-highlight" aria-hidden="true" />
      {VARIANTS.map((v, i) => (
        <button
          key={v.key}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          type="button"
          className="proto-picker-item"
          data-active={i === current ? "" : undefined}
          aria-current={i === current ? "true" : undefined}
          onClick={() => onSelect(i)}
        >
          {v.name}
        </button>
      ))}
    </nav>
  );
}

export function MenuHoverProto({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = use(searchParams);
  const [current, setCurrent] = useState(() => {
    const n = parseInt(v ?? "", 10);
    return n >= 1 && n <= VARIANTS.length ? n - 1 : 0;
  });

  const select = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= VARIANTS.length) select(n - 1);
      else if (e.key === "ArrowRight" && !t.closest("[role=toolbar]"))
        select((current + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft" && !t.closest("[role=toolbar]"))
        select((current - 1 + VARIANTS.length) % VARIANTS.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select]);

  return (
    <main className="h-dvh w-full">
      <CabinScreen.Root defaultPhase="riding" className="size-full">
        <CabinMap.Viewport>
          <CabinMap.City />
          <CabinMap.Cones />
          <CabinMap.Traffic />
          <CabinMap.Route />
          <CabinMap.Vehicle />
          <CabinMap.Camera />
        </CabinMap.Viewport>
        {/* Keyed so switching re-mounts the variant cleanly. */}
        <HoverMenu key={VARIANTS[current].key} variant={VARIANTS[current].key} />
      </CabinScreen.Root>
      <Picker current={current} onSelect={select} />
    </main>
  );
}
