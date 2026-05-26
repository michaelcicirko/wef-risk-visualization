import { useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './FluidSimulation.module.css';

// --- DATA LAYER (substitution point) ---
const SIM_RESOLUTION = 256;
const DYE_COLORS = [
  [0.0, 0.8, 1.0],
  [1.0, 0.2, 0.5],
  [0.4, 1.0, 0.3],
];

const INJECT_POINTS = [
  { x: 0.25, y: 0.5 },
  { x: 0.75, y: 0.5 },
  { x: 0.5, y: 0.25 },
];

export default function FluidSimulation() {
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, prevX: 0, prevY: 0, down: false });
  const timeRef = useRef(0);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
    if (!gl) return;
    glRef.current = gl;

    const width = canvas.width;
    const height = canvas.height;

    // Utility: compile shader
    function compileShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }

    function createProgram(vs, fs) {
      const prog = gl.createProgram();
      gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vs));
      gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
      return prog;
    }

    // Full-screen quad vertex shader
    const quadVS = `#version 300 es
      in vec2 a_position;
      out vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Advection shader
    const advectFS = `#version 300 es
      precision highp float;
      in vec2 v_uv;
      uniform sampler2D u_velocity;
      uniform sampler2D u_source;
      uniform float u_dt;
      uniform vec2 u_texelSize;
      out vec4 fragColor;
      void main() {
        vec2 vel = texture(u_velocity, v_uv).xy;
        vec2 pos = v_uv - vel * u_dt * u_texelSize;
        fragColor = 0.998 * texture(u_source, pos);
      }
    `;

    // Splat shader (add dye/velocity)
    const splatFS = `#version 300 es
      precision highp float;
      in vec2 v_uv;
      uniform sampler2D u_target;
      uniform vec2 u_point;
      uniform vec3 u_color;
      uniform float u_radius;
      out vec4 fragColor;
      void main() {
        vec4 base = texture(u_target, v_uv);
        float d = distance(v_uv, u_point);
        float s = exp(-d * d / u_radius);
        fragColor = base + vec4(u_color * s, s);
      }
    `;

    // Display shader
    const displayFS = `#version 300 es
      precision highp float;
      in vec2 v_uv;
      uniform sampler2D u_texture;
      out vec4 fragColor;
      void main() {
        vec3 c = texture(u_texture, v_uv).rgb;
        fragColor = vec4(c, 1.0);
      }
    `;

    const advectProg = createProgram(quadVS, advectFS);
    const splatProg = createProgram(quadVS, splatFS);
    const displayProg = createProgram(quadVS, displayFS);

    // Framebuffer pair
    function createFBO() {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, SIM_RESOLUTION, SIM_RESOLUTION, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return { tex, fbo };
    }

    let velocity = [createFBO(), createFBO()];
    let dye = [createFBO(), createFBO()];

    // Quad VAO
    const quadVAO = gl.createVertexArray();
    gl.bindVertexArray(quadVAO);
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(advectProg, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    function blit(fbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function advect(source, vel, target) {
      gl.useProgram(advectProg);
      gl.uniform1i(gl.getUniformLocation(advectProg, 'u_velocity'), 0);
      gl.uniform1i(gl.getUniformLocation(advectProg, 'u_source'), 1);
      gl.uniform1f(gl.getUniformLocation(advectProg, 'u_dt'), 0.016);
      gl.uniform2f(gl.getUniformLocation(advectProg, 'u_texelSize'), SIM_RESOLUTION, SIM_RESOLUTION);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, vel.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, source.tex);
      blit(target.fbo);
    }

    function splat(target, x, y, color, radius) {
      gl.useProgram(splatProg);
      gl.uniform1i(gl.getUniformLocation(splatProg, 'u_target'), 0);
      gl.uniform2f(gl.getUniformLocation(splatProg, 'u_point'), x, y);
      gl.uniform3f(gl.getUniformLocation(splatProg, 'u_color'), color[0], color[1], color[2]);
      gl.uniform1f(gl.getUniformLocation(splatProg, 'u_radius'), radius);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, target[0].tex);
      blit(target[1].fbo);
      [target[0], target[1]] = [target[1], target[0]];
    }

    function frame() {
      timeRef.current += 0.016;
      gl.viewport(0, 0, SIM_RESOLUTION, SIM_RESOLUTION);
      gl.bindVertexArray(quadVAO);

      // Auto-inject dye streams
      INJECT_POINTS.forEach((pt, i) => {
        const angle = timeRef.current * 0.5 + i * 2.1;
        const px = pt.x + Math.sin(angle) * 0.1;
        const py = pt.y + Math.cos(angle * 0.7) * 0.1;
        const col = DYE_COLORS[i % DYE_COLORS.length];
        splat(dye, px, py, col, 0.003);
        splat(velocity, px, py, [Math.sin(angle) * 5, Math.cos(angle) * 5, 0], 0.005);
      });

      // Mouse interaction
      if (mouseRef.current.down) {
        const mx = mouseRef.current.x / width;
        const my = 1.0 - mouseRef.current.y / height;
        const dx = (mouseRef.current.x - mouseRef.current.prevX) * 10;
        const dy = -(mouseRef.current.y - mouseRef.current.prevY) * 10;
        splat(dye, mx, my, [1, 1, 1], 0.002);
        splat(velocity, mx, my, [dx, dy, 0], 0.004);
      }

      // Advect velocity
      advect(velocity[0], velocity[0], velocity[1]);
      [velocity[0], velocity[1]] = [velocity[1], velocity[0]];

      // Advect dye
      advect(dye[0], velocity[0], dye[1]);
      [dye[0], dye[1]] = [dye[1], dye[0]];

      // Display
      gl.viewport(0, 0, width, height);
      gl.useProgram(displayProg);
      gl.uniform1i(gl.getUniformLocation(displayProg, 'u_texture'), 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dye[0].tex);
      blit(null);

      animRef.current = requestAnimationFrame(frame);
    }

    frame();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 1200;
    canvas.height = 600;
    init();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const gl = glRef.current;
      if (gl) {
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      }
    };
  }, [init]);

  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.prevX = mouseRef.current.x;
    mouseRef.current.prevY = mouseRef.current.y;
    mouseRef.current.x = (e.clientX - rect.left) * (canvasRef.current.width / rect.width);
    mouseRef.current.y = (e.clientY - rect.top) * (canvasRef.current.height / rect.height);
  }, []);

  const handleMouseDown = useCallback(() => { mouseRef.current.down = true; }, []);
  const handleMouseUp = useCallback(() => { mouseRef.current.down = false; }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link to="/" className={styles.backLink}>← Dashboard</Link>
        <h1 className={styles.title}>Fluid Simulation</h1>
        <p className={styles.subtitle}>
          Incompressible fluid via WebGL2 ping-pong FBO with GLSL advection shaders. Three coloured dye streams represent data migration flows. Click and drag to disturb the fluid field.
        </p>
      </div>
      <div className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
      <p className={styles.hint}>Click and drag to inject turbulence</p>
      <div className={styles.stats}>
        <span className={styles.stat}>Resolution: <span className={styles.statValue}>{SIM_RESOLUTION}×{SIM_RESOLUTION}</span></span>
        <span className={styles.stat}>Streams: <span className={styles.statValue}>{INJECT_POINTS.length}</span></span>
        <span className={styles.stat}>Engine: <span className={styles.statValue}>WebGL2 Navier-Stokes</span></span>
      </div>
    </div>
  );
}
