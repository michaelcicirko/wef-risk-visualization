import { useRef, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './DemocracySonification.module.css';

const YEARS = Array.from({ length: 50 }, (_, i) => 1975 + i);

function generateDemocracyIndex() {
  const data = {};
  let val = 0.65;
  YEARS.forEach((year) => {
    val += (Math.random() - 0.48) * 0.04;
    val = Math.max(0.1, Math.min(1.0, val));
    data[year] = val;
  });
  return data;
}

const DEMOCRACY_DATA = generateDemocracyIndex();

function mapToFrequency(score) {
  return 80 + score * 720;
}

export default function DemocracySonification() {
  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [year, setYear] = useState(1975);
  const [score, setScore] = useState(DEMOCRACY_DATA[1975]);

  const startAudio = useCallback(() => {
    if (audioCtxRef.current) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const analyser = ctx.createAnalyser();

    analyser.fftSize = 256;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(mapToFrequency(DEMOCRACY_DATA[year]), ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);

    osc.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);
    osc.start();

    audioCtxRef.current = ctx;
    oscillatorRef.current = osc;
    gainRef.current = gain;
    analyserRef.current = analyser;

    setIsPlaying(true);
    drawVisualization();
  }, [year]);

  const stopAudio = useCallback(() => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    gainRef.current = null;
    analyserRef.current = null;
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); } catch (_) {}
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const handleYearChange = useCallback((e) => {
    const y = parseInt(e.target.value, 10);
    setYear(y);
    const s = DEMOCRACY_DATA[y];
    setScore(s);

    if (oscillatorRef.current && audioCtxRef.current) {
      const freq = mapToFrequency(s);
      oscillatorRef.current.frequency.setTargetAtTime(freq, audioCtxRef.current.currentTime, 0.1);

      const amplitude = 0.05 + (1 - s) * 0.25;
      gainRef.current.gain.setTargetAtTime(amplitude, audioCtxRef.current.currentTime, 0.1);
    }
  }, []);

  const drawVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#080812';
      ctx.fillRect(0, 0, w, h);

      const barWidth = w / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * h * 0.8;
        const hue = 160 + (dataArray[i] / 255) * 40;
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.8)`;
        ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);

        ctx.fillStyle = `hsla(${hue}, 90%, 70%, 0.3)`;
        ctx.fillRect(x, h - barHeight - 4, barWidth - 1, 4);

        x += barWidth;
      }
    }

    draw();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>Democracy Sonification</h1>
        <p className={styles.subtitle}>
          V-Dem stability index mapped to oscillator frequency (80–800Hz). Lower democracy scores produce lower, more ominous tones. Click Play to start — audio requires user gesture.
        </p>
      </div>
      <div className={styles.visualizerWrapper}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <span className={styles.yearLabel}>{year}</span>
      </div>
      <div className={styles.controls}>
        <button
          className={`${styles.controlBtn} ${isPlaying ? styles.controlBtnActive : ''}`}
          onClick={isPlaying ? stopAudio : startAudio}
        >
          {isPlaying ? '■ Stop' : '▶ Play'}
        </button>
        <div className={styles.sliderGroup}>
          <span className={styles.sliderLabel}>Year</span>
          <input
            type="range"
            className={styles.slider}
            min="1975"
            max="2024"
            step="1"
            value={year}
            onChange={handleYearChange}
          />
          <span className={styles.sliderValue}>{year} — {(score * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div className={styles.stats}>
        <span className={styles.stat}>Frequency: <span className={styles.statValue}>{mapToFrequency(score).toFixed(0)} Hz</span></span>
        <span className={styles.stat}>Index: <span className={styles.statValue}>{score.toFixed(3)}</span></span>
        <span className={styles.stat}>Engine: <span className={styles.statValue}>Web Audio API</span></span>
      </div>
    </div>
  );
}
