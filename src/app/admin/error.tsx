"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel state-error">
      <h2 className="display">No pudimos cargar esta sección</h2>
      <button className="btn btn-red" onClick={reset}>
        Reintentar
      </button>
    </div>
  );
}
