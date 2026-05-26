// Web Worker: generates 1M synthetic telemetry data points off the main thread.
// Each point has x (time index), y (sensor reading), and density cluster assignment.

const POINT_COUNT = 1_000_000;

self.onmessage = function (e) {
  const { width, height } = e.data;
  const points = new Float32Array(POINT_COUNT * 3);

  for (let i = 0; i < POINT_COUNT; i++) {
    const cluster = Math.floor(Math.random() * 5);
    const cx = [0.2, 0.4, 0.5, 0.7, 0.85][cluster];
    const cy = [0.3, 0.6, 0.5, 0.4, 0.7][cluster];
    const spread = [0.08, 0.06, 0.12, 0.07, 0.05][cluster];

    const x = cx + (Math.random() - 0.5) * spread * 2 + (Math.random() - 0.5) * 0.02;
    const y = cy + (Math.random() - 0.5) * spread * 2 + (Math.random() - 0.5) * 0.02;

    points[i * 3] = x * width;
    points[i * 3 + 1] = y * height;
    points[i * 3 + 2] = cluster;
  }

  self.postMessage({ points, count: POINT_COUNT }, [points.buffer]);
};
