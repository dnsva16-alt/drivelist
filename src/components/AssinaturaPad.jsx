import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";

const AssinaturaPad = forwardRef(function AssinaturaPad(_, ref) {
  const canvasRef = useRef(null);
  const desenhando = useRef(false);
  const [vazio, setVazio] = useState(true);

  useImperativeHandle(ref, () => ({
    getDataURL: () => (vazio ? null : canvasRef.current?.toDataURL("image/png")),
    limpar: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      setVazio(true);
    },
    isEmpty: () => vazio,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / r.width;
      const sy = canvas.height / r.height;
      const src = e.touches ? e.touches[0] : e;
      return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
    }

    function iniciar(e) {
      e.preventDefault();
      desenhando.current = true;
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function desenhar(e) {
      e.preventDefault();
      if (!desenhando.current) return;
      const { x, y } = pos(e);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0f172a";
      ctx.lineTo(x, y);
      ctx.stroke();
      setVazio(false);
    }

    function parar(e) {
      e.preventDefault?.();
      desenhando.current = false;
    }

    canvas.addEventListener("mousedown", iniciar);
    canvas.addEventListener("mousemove", desenhar);
    canvas.addEventListener("mouseup", parar);
    canvas.addEventListener("mouseleave", parar);
    canvas.addEventListener("touchstart", iniciar, { passive: false });
    canvas.addEventListener("touchmove", desenhar, { passive: false });
    canvas.addEventListener("touchend", parar, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", iniciar);
      canvas.removeEventListener("mousemove", desenhar);
      canvas.removeEventListener("mouseup", parar);
      canvas.removeEventListener("mouseleave", parar);
      canvas.removeEventListener("touchstart", iniciar);
      canvas.removeEventListener("touchmove", desenhar);
      canvas.removeEventListener("touchend", parar);
    };
  }, []);

  function limpar() {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setVazio(true);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={640}
        height={180}
        style={{
          width: "100%",
          height: "150px",
          border: `2px solid ${vazio ? "#e2e8f0" : "#0f172a"}`,
          borderRadius: "10px",
          background: "white",
          cursor: "crosshair",
          touchAction: "none",
          display: "block",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
        <span style={{ fontSize: "12px", color: vazio ? "#94a3b8" : "#10b981", fontWeight: "500" }}>
          {vazio ? "Desenhe sua assinatura acima" : "✓ Assinatura registrada"}
        </span>
        {!vazio && (
          <button type="button" onClick={limpar} className="btn-cancel" style={{ padding: "4px 12px", fontSize: "12px" }}>
            Limpar
          </button>
        )}
      </div>
    </div>
  );
});

export default AssinaturaPad;
