import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main id="contenido" className="section wrap">
      <Logo />
      <h1 className="display" style={{ fontSize: "4rem" }}>
        No está esta página
      </h1>
      <Link className="btn btn-red" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
