/** Looping Ken Burns plate from generated stills — the cutscene "video". */

function coverDraw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  zoom: number,
  panX: number,
  panY: number
) {
  const scale = Math.max(width / img.width, height / img.height) * zoom;
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (width - w) / 2 + panX * w;
  const y = (height - h) / 2 + panY * h;
  ctx.drawImage(img, x, y, w, h);
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith("data:") && !url.startsWith("/")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("still failed"));
    img.src = url;
  });
}

export function attachMotionPlate(
  canvas: HTMLCanvasElement,
  urls: string[]
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx || urls.length === 0) return () => {};

  let gone = false;
  let raf = 0;
  let images: HTMLImageElement[] = [];

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  };
  resize();
  window.addEventListener("resize", resize);

  const tick = (now: number) => {
    if (gone) return;
    const { width, height } = canvas;
    if (!images.length || !width || !height) {
      raf = requestAnimationFrame(tick);
      return;
    }
    const cycle = 9000;
    const t = (now % cycle) / cycle;
    const a = images[0]!;
    const b = images[1] || images[0]!;
    const zoomA = 1.04 + t * 0.12;
    const zoomB = 1.16 - t * 0.1;
    ctx.fillStyle = "#050506";
    ctx.fillRect(0, 0, width, height);
    if (t < 0.55) {
      coverDraw(ctx, a, width, height, zoomA, t * -0.03, t * 0.015);
      if (t > 0.38) {
        ctx.globalAlpha = (t - 0.38) / 0.17;
        coverDraw(ctx, b, width, height, zoomB, 0.02 - t * 0.02, -0.01);
        ctx.globalAlpha = 1;
      }
    } else {
      coverDraw(ctx, b, width, height, zoomB, 0.02 - t * 0.02, -0.01);
    }
    raf = requestAnimationFrame(tick);
  };

  void Promise.allSettled(urls.map(loadImage)).then((results) => {
    if (gone) return;
    images = results
      .filter((item): item is PromiseFulfilledResult<HTMLImageElement> =>
        item.status === "fulfilled"
      )
      .map((item) => item.value);
    if (images.length) raf = requestAnimationFrame(tick);
  });

  return () => {
    gone = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
  };
}
