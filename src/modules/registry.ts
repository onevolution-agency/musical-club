export const modules = [
  {
    id: "cms",
    title: "Sitio público",
    summary: "Copy de la propuesta, SEO, JSON-LD y páginas de contacto.",
  },
  {
    id: "auth",
    title: "Acceso y roles",
    summary: "Alumnos, profesores, admin de barrio y super admin. Email, contraseña y magic link.",
  },
  {
    id: "barrios",
    title: "Barrios",
    summary: "Cada barrio es un tenant: actividades, cuotas, pagos y asistencia quedan aislados.",
  },
  {
    id: "activities",
    title: "Actividades",
    summary: "Grupos, horarios, cupo, precio y frecuencia de cuota.",
  },
  {
    id: "enrollments",
    title: "Inscripciones",
    summary: "Alta, lista de espera, baja y cupo.",
  },
  {
    id: "students",
    title: "Alumnos",
    summary: "Perfil, horario y QR personal.",
  },
  {
    id: "teachers",
    title: "Profesores",
    summary: "Asignación a actividades e invitación.",
  },
  {
    id: "attendance",
    title: "Asistencia",
    summary: "Sesión de clase, escaneo de QR y marca manual sin duplicados.",
  },
  {
    id: "payments",
    title: "Cuotas y pagos",
    summary: "Mercado Pago para el alumno. Efectivo solo lo registra un admin.",
  },
  {
    id: "dashboard",
    title: "Tablero",
    summary: "Ingresos por medio de pago, mora, asistencia y conciliación de efectivo.",
  },
] as const;
