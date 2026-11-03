"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { INTRO_DURATION_MS, INTRO_REDUCED_MS, INTRO_SEEN_KEY } from "@/lib/intro";

/**
 * На сервере эффекта разметки нет — там достаточно useEffect.
 * В браузере он нужен: атрибут data-intro должен смениться до отрисовки,
 * иначе при переходе на /?intro=1 страница мелькнёт под заставкой.
 */
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Заставка сайта — пять сцен, нарисованных кодом.
 *
 * Бумага, нить, выноски, титул и разворот идут по одной временной шкале,
 * заданной в app/intro.css. Ничего не грузится из сети: лист, строчка и
 * выноски нарисованы SVG-контурами.
 *
 * Показывается один раз за сессию — отметка лежит в sessionStorage.
 * Ссылка «Показать заставку снова» в подвале открывает главную с ?intro=1.
 */

/** Тик швейной машинки: короткий щелчок плюс тихий гул мотора. */
type SoundHandle = {
  stop: () => void;
};

const stitchSound = (): SoundHandle | null => {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  const ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();

  const hum = ctx.createOscillator();
  hum.type = "sine";
  hum.frequency.value = 92;
  const humGain = ctx.createGain();
  humGain.gain.value = 0.015;
  hum.connect(humGain).connect(ctx.destination);
  hum.start();

  let beat = 0;
  const tick = () => {
    const length = Math.floor(ctx.sampleRate * 0.04);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = beat % 2 === 0 ? 2600 : 2100;
    band.Q.value = 1.6;
    const gain = ctx.createGain();
    gain.gain.value = 0.09;
    source.connect(band).connect(gain).connect(ctx.destination);
    source.start(ctx.currentTime);
    beat += 1;
  };

  tick();
  const timer = window.setInterval(tick, 250);

  return {
    stop: () => {
      window.clearInterval(timer);
      humGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      hum.stop(ctx.currentTime + 0.2);
      void ctx.close();
    },
  };
};

export function IntroFilm() {
  // null — решение ещё не принято: разметка уже в HTML, и её вид задаёт
  // серверный скрипт в layout.tsx. Это убирает мигание перед гидратацией.
  const [playing, setPlaying] = useState<boolean | null>(null);
  const [reduced, setReduced] = useState(false);
  const [armed, setArmed] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  const soundRef = useRef<SoundHandle | null>(null);
  const timersRef = useRef<number[]>([]);

  const stopSound = useCallback(() => {
    soundRef.current?.stop();
    soundRef.current = null;
    setSoundOn(false);
  }, []);

  const finish = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    stopSound();
    document.documentElement.dataset.intro = "off";
    setPlaying(false);
  }, [stopSound]);

  useBeforePaint(() => {
    const forced = new URLSearchParams(window.location.search).get("intro") === "1";
    const seen = document.documentElement.dataset.intro === "off";

    if (!forced && seen) {
      setPlaying(false);
      return;
    }

    // Отметку ставим сразу: заставка за сессию нужна один раз, даже если
    // зритель уйдёт со страницы, не досмотрев её.
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // Приватный режим может запретить sessionStorage — тогда заставка
      // покажется ещё раз. Это не поломка.
    }

    document.documentElement.dataset.intro = "on";

    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(isReduced);
    setPlaying(true);
    setArmed(isReduced);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timers: number[] = [];
    timers.push(window.setTimeout(finish, isReduced ? INTRO_REDUCED_MS : INTRO_DURATION_MS + 400));
    timersRef.current = timers;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      timers.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
      document.body.style.overflow = previousOverflow;
      // Ушли со страницы, не досмотрев заставку: в этой сессии она уже
      // не нужна, отметка в sessionStorage проставлена.
      document.documentElement.dataset.intro = "off";
    };
  }, [finish]);

  const toggleSound = useCallback(() => {
    if (soundRef.current) {
      stopSound();
      return;
    }
    const handle = stitchSound();
    if (!handle) return;
    soundRef.current = handle;
    setSoundOn(true);
  }, [stopSound]);

  if (playing === false) return null;

  return (
    <div
      className="intro-film"
      role="dialog"
      aria-modal="true"
      aria-label="Заставка Швейки"
      data-reduced={reduced ? "" : undefined}
      onAnimationEnd={(event) => {
        // Страницу отпускаем ровно в конце анимации разворота.
        if (event.animationName === "intro-close") finish();
      }}
    >
      <div className="intro-stage">
        <svg className="intro-sheet" viewBox="0 0 320 420" fill="none" aria-hidden="true">
          <path
            className="intro-sheet__back"
            d="M24 16C68 8 118 18 166 12c48-6 94 4 130-2l2 388c-40 8-86-2-136 6-50 7-96-4-140 2Z"
          />
          <path
            className="intro-sheet__paper"
            d="M24 16C68 8 118 18 166 12c48-6 94 4 130-2l2 388c-40 8-86-2-136 6-50 7-96-4-140 2Z"
          />

          <g className="intro-sheet__rules">
            <line x1="44" y1="86" x2="278" y2="86" />
            <line x1="44" y1="126" x2="278" y2="126" />
            <line x1="44" y1="166" x2="278" y2="166" />
            <line x1="44" y1="206" x2="278" y2="206" />
            <line x1="44" y1="330" x2="278" y2="330" />
            <line x1="44" y1="370" x2="278" y2="370" />
          </g>

          {/* Строчка: машина шьёт по листу. */}
          <path
            className="intro-stitch"
            d="M48 290C72 287 100 278 124 278c28 0 52 12 82 18 26 5 50-4 74-16"
          />

          <g className="intro-callouts">
            <g className="intro-callout intro-callout--1">
              <path className="intro-callout__leader" d="M74 285 44 224" />
              <circle className="intro-callout__dot" cx="74" cy="285" r="2.6" />
              <circle className="intro-callout__ring" cx="74" cy="285" r="10" />
              <text className="intro-callout__num" x="74" y="285">
                1
              </text>
            </g>
            <g className="intro-callout intro-callout--2">
              <path className="intro-callout__leader" d="M148 281 138 206" />
              <circle className="intro-callout__dot" cx="148" cy="281" r="2.6" />
              <circle className="intro-callout__ring" cx="148" cy="281" r="10" />
              <text className="intro-callout__num" x="148" y="281">
                2
              </text>
            </g>
            <g className="intro-callout intro-callout--3">
              <path className="intro-callout__leader" d="M225 297 256 230" />
              <circle className="intro-callout__dot" cx="225" cy="297" r="2.6" />
              <circle className="intro-callout__ring" cx="225" cy="297" r="10" />
              <text className="intro-callout__num" x="225" y="297">
                3
              </text>
            </g>
          </g>
        </svg>

        <div className="intro-title">
          <p className="intro-title__word">Швейка</p>
          <p className="intro-title__latin">Acus et Filum · Ars sartoria domestica</p>
        </div>
      </div>

      <div className="intro-controls" data-armed={armed ? "" : undefined}>
        <button
          type="button"
          className="intro-btn intro-skip"
          onClick={finish}
          tabIndex={armed ? 0 : -1}
        >
          Пропустить →
        </button>
        <button
          type="button"
          className="intro-btn"
          onClick={toggleSound}
          aria-pressed={soundOn}
          tabIndex={armed ? 0 : -1}
        >
          {soundOn ? "Звук: вкл" : "Звук: выкл"}
        </button>
      </div>
    </div>
  );
}
