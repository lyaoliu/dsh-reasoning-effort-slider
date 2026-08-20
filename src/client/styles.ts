export const CSS = `
.dsh-res-slider {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.dsh-res-slider:hover {
  background-color: var(--ds-surface-raised, rgba(255,255,255,0.05));
}

.dsh-res-slider-track {
  position: relative;
  width: 120px;
  height: 24px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--ds-background-secondary, #1a1a1a);
}

.dsh-res-slider-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.dsh-res-slider-knob {
  position: absolute;
  top: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--ds-brand-primary, #6366f1);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
  transition: left 0.1s ease-out;
  pointer-events: none;
}

.dsh-res-slider-label {
  font-size: 12px;
  color: var(--ds-text-secondary, #888);
  min-width: 40px;
  text-align: center;
}

.dsh-res-slider-levels {
  display: flex;
  gap: 2px;
  margin-top: 4px;
}

.dsh-res-slider-level {
  flex: 1;
  height: 3px;
  border-radius: 1px;
  background: var(--ds-border, #333);
  transition: background-color 0.2s;
}

.dsh-res-slider-level.active {
  background: var(--ds-brand-primary, #6366f1);
}
`
