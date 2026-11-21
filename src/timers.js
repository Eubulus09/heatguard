export function createCountdown({ onUpdate, onComplete } = {}) {
  let totalSeconds = 0;
  let remaining = 0;
  let timer = null;

  function emit() {
    onUpdate?.(remaining, totalSeconds);
  }

  function pause() {
    if (timer === null) return;
    clearInterval(timer);
    timer = null;
  }

  function tick() {
    remaining -= 1;
    if (remaining <= 0) {
      pause();
      remaining = 0;
      emit();
      onComplete?.();
      return;
    }
    emit();
  }

  return {
    setMinutes(minutes) {
      pause();
      totalSeconds = Math.max(1, Math.round(Number(minutes) * 60));
      remaining = totalSeconds;
      emit();
    },
    start() {
      if (timer !== null || remaining <= 0) return;
      timer = setInterval(tick, 1000);
    },
    pause,
    reset() {
      pause();
      remaining = totalSeconds;
      emit();
    },
    isRunning() {
      return timer !== null;
    }
  };
}

export function formatCountdown(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}
