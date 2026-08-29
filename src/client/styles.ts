export const CSS = `
.dsh-res-slider {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
}

.dsh-res-slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dsh-res-slider-title {
  font-size: 13px;
  color: var(--dsw-alias-label-primary, #15171b);
}

.dsh-res-slider-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--ds-brand-primary, #6366f1);
}

.dsh-res-slider-track {
  position: relative;
  height: 28px;
  border-radius: 14px;
  background: var(--dsw-alias-fill-tertiary, rgba(120,125,140,.15));
}

.dsh-res-slider-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  clip-path: inset(0 round 14px);
}

.dsh-res-slider-track[data-effect="gradient"] {
  background: linear-gradient(90deg, #3b82f6, #22c55e, #eab308, #ef4444);
}
.dsh-res-slider-track[data-effect="particles"] {
  background: linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7, #d946ef);
}
.dsh-res-slider-track[data-effect="radiation"] {
  background: var(--dsw-alias-fill-tertiary, rgba(120,125,140,.15));
}
body[data-ds-dark-theme] .dsh-res-slider-track[data-effect="radiation"] {
  background: rgba(255,255,255,.08);
}
body:not([data-ds-dark-theme]) .dsh-res-slider-track[data-effect="radiation"] {
  background: var(--dsw-static-blue-75, #e5f0ff);
}
.dsh-res-slider-track[data-effect="electric"] {
  background: var(--dsw-static-blue-75, #eef2ff);
}
body[data-ds-dark-theme] .dsh-res-slider-track[data-effect="electric"] {
  background: rgba(16,20,40,.9);
}
.dsh-res-slider-track[data-effect="flame"] {
  background: rgba(255,140,60,.12);
}
body[data-ds-dark-theme] .dsh-res-slider-track[data-effect="flame"] {
  background: rgba(255,120,40,.10);
}
.dsh-res-slider-track[data-effect="starfield"] {
  background: #dfe7ff;
}
body[data-ds-dark-theme] .dsh-res-slider-track[data-effect="starfield"] {
  background: #0b1020;
}
.dsh-res-slider-track[data-effect="ripple"] {
  background: #e3f2ff;
}
body[data-ds-dark-theme] .dsh-res-slider-track[data-effect="ripple"] {
  background: rgba(16,36,64,.7);
}

.dsh-res-slider-knob {
  position: absolute;
  top: 50%;
  left: 0%;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff 0%, #e0e0e0 40%, #909090 100%);
  box-shadow:
    0 2px 6px rgba(0,0,0,0.3),
    0 0 calc(4px + 12px * var(--re-intensity, 0)) rgba(92, 105, 255, calc(0.12 + 0.38 * var(--re-intensity, 0)));
  transform: translate(-50%, -50%);
  transition: left 0.1s ease-out;
  pointer-events: none;
}

.dsh-res-slider.is-dragging .dsh-res-slider-knob {
  transition: none;
  transform: translate(-50%, -50%) scale(1.12);
}

.dsh-res-slider.is-chibi {
  height: 56px;
}
.dsh-res-slider.is-chibi .dsh-res-slider-knob,
.dsh-res-slider.is-chibi .chibi-knob {
  width: 40px;
  height: 55px;
  border: 0;
  border-radius: 8px;
  background-color: transparent;
  background-repeat: no-repeat;
  background-position: 0 0;
  background-size: 800% 100%;
  box-shadow: none !important;
  filter:
    drop-shadow(0 1px 1px rgba(0, 0, 0, .28))
    drop-shadow(0 0 5px rgba(92, 105, 255, .34));
  animation:
    dsh-chibi-run 720ms step-end infinite,
    dsh-chibi-bob 1.6s ease-in-out infinite;
  transform: translate(-50%, -70%);
}
.dsh-res-slider.is-chibi.is-dragging .dsh-res-slider-knob,
.dsh-res-slider.is-chibi.is-dragging .chibi-knob {
  animation-duration: 420ms, 900ms;
  transform: translate(-50%, -70%) scale(1.06);
  filter:
    drop-shadow(0 2px 1px rgba(0, 0, 0, .28))
    drop-shadow(0 0 8px rgba(87, 137, 255, .68));
}
@keyframes dsh-chibi-run {
  from { background-position: 0 0; }
  to { background-position: -800% 0; }
}
@keyframes dsh-chibi-bob {
  0%, 100% { margin-top: 0; }
  50% { margin-top: -2px; }
}

.re-model-root {
  position: relative;
  display: inline-flex;
  min-width: 0;
}
.re-model-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 230px;
  height: 28px;
  padding: 0 8px 0 10px;
  border: 0;
  border-radius: 9px;
  color: var(--dsw-alias-label-primary, #15171b);
  background: transparent;
  font: inherit;
  cursor: pointer;
  transition: background 140ms ease;
}
.re-model-trigger:hover,
.re-model-trigger[aria-expanded="true"] {
  background: var(--dsw-alias-fill-tertiary, rgba(120,125,140,.1));
}
.re-model-trigger:disabled { cursor: not-allowed; opacity: .5; }
.re-model-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 1;
}
.re-model-effort {
  flex: 0 0 auto;
  color: var(--dsw-static-deepseek-500, #4d70ff);
  font-size: 12px;
  line-height: 1;
}
.re-model-chevron {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  margin: -3px 1px 0 3px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  opacity: .55;
  transform: rotate(45deg);
  transition: transform 150ms ease, margin 150ms ease;
}
.re-model-trigger[aria-expanded="true"] .re-model-chevron {
  margin-top: 3px;
  transform: rotate(225deg);
}
.re-model-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 1200;
  width: min(380px, calc(100vw - 32px));
  overflow: hidden;
  border: 1px solid var(--dsw-alias-stroke-secondary, rgba(121,126,145,.2));
  border-radius: 16px;
  color: var(--dsw-alias-label-primary, #15171b);
  background: var(--dsw-alias-bg-elevated, #fff);
  box-shadow: 0 14px 42px rgba(18, 24, 42, .18), 0 3px 10px rgba(18, 24, 42, .08);
  animation: re-menu-in 150ms cubic-bezier(.22,1,.36,1);
}
.re-advanced {
  padding: 14px;
}
.re-menu-separator {
  height: 1px;
  background: var(--dsw-alias-stroke-secondary, rgba(121,126,145,.16));
}
.re-model-row,
.re-model-option,
.re-model-back {
  width: 100%;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  cursor: pointer;
}
.re-model-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  min-height: 45px;
  padding: 0 14px;
  text-align: left;
}
.re-model-row:hover,
.re-model-option:hover,
.re-model-back:hover { background: var(--dsw-alias-fill-tertiary, rgba(120,125,140,.09)); }
.re-model-row-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.re-model-row-effort { color: var(--dsw-static-deepseek-500, #4d70ff); font-size: 12px; }
.re-row-chevron { font-size: 20px; line-height: 1; opacity: .42; }
.re-model-pane { max-height: min(390px, 60vh); overflow-y: auto; padding: 7px; }
.re-model-back {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 8px;
  border-radius: 8px;
  text-align: left;
  color: var(--dsw-alias-label-secondary, #686c75);
  font-size: 12px;
}
.re-model-group-title { padding: 10px 9px 5px; color: var(--dsw-alias-label-tertiary, #9296a0); font-size: 11px; }
.re-model-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20px;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 7px 9px;
  border-radius: 9px;
  text-align: left;
}
.re-model-option-copy { min-width: 0; }
.re-model-option-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.re-model-option-desc { display: block; margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary, #9296a0); font-size: 10px; }
.re-model-check { color: var(--dsw-static-deepseek-500, #4d70ff); font-size: 15px; text-align: center; }
.re-model-status { padding: 14px; color: var(--dsw-alias-label-tertiary, #9296a0); font-size: 12px; text-align: center; }
.re-model-error { margin: 8px; padding: 8px 10px; border-radius: 8px; color: var(--dsw-alias-state-error-primary, #c83e4d); background: var(--dsw-alias-state-error-tertiary, rgba(220,55,70,.08)); font-size: 11px; }
body[data-ds-dark-theme] .re-model-menu {
  border-color: rgba(136, 145, 180, .2);
  color: var(--dsw-alias-label-primary, #f2f4f8);
  background: var(--dsw-alias-bg-elevated, #202126);
  box-shadow: 0 18px 46px rgba(0,0,0,.48), 0 3px 12px rgba(0,0,0,.32);
}
body[data-ds-dark-theme] .re-model-trigger { color: var(--dsw-alias-label-primary, #f2f4f8); }
@keyframes re-menu-in {
  from { opacity: 0; transform: translateY(5px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.dsh-res-effects-label {
  display: block;
  margin-bottom: 8px;
  color: var(--dsw-alias-label-secondary, #686c75);
  font-size: 12px;
}
.dsh-res-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dsh-res-effect-chip {
  border: 1px solid var(--dsw-alias-stroke-secondary, rgba(121,126,145,.25));
  border-radius: 999px;
  padding: 4px 12px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #686c75);
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, border-color 140ms ease;
}
.dsh-res-effect-chip:hover {
  background: var(--dsw-alias-fill-tertiary, rgba(120,125,140,.09));
  color: var(--dsw-alias-label-primary, #15171b);
}
.dsh-res-effect-chip.is-active {
  background: var(--dsw-static-deepseek-500, #4d70ff);
  border-color: var(--dsw-static-deepseek-500, #4d70ff);
  color: #fff;
}
body[data-ds-dark-theme] .dsh-res-effect-chip.is-active {
  background: var(--dsw-static-deepseek-500, #4d70ff);
  color: #fff;
}
`
