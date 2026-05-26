self.onmessage = function (e) {
  const { count, width, height } = e.data;
  const points = new Float32Array(count * 2);

  const clusterCount = 5;
  const clusterCenters = [];
  for (let i = 0; i < clusterCount; i++) {
    clusterCenters.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.6 + height * 0.2,
    });
  }

  for (let i = 0; i < count; i++) {
    const cluster = clusterCenters[Math.floor(Math.random() * clusterCount)];
    const spread = 40 + Math.random() * 80;
    points[i * 2] = cluster.x + (Math.random() - 0.5) * spread;
    points[i * 2 + 1] = cluster.y + (Math.random() - 0.5) * spread;
  }

  self.postMessage({ points }, [points.buffer]);
};
