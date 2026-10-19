"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel state-error">
      <h2 className="display">Algo salió mal</h2>
      <p>No pudimos cargar esta pantalla.</p>
      <button className="btn btn-red" onClick={reset}>
        Reintentar
      </button>
    </div>
  );
}
