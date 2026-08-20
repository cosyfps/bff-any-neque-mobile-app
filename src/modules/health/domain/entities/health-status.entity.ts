/**
 * Estado de salud del proceso. Entidad de dominio: sin decoradores, sin NestJS,
 * sin Swagger. Cuando entre la verificacion de Supabase (NEQUEBFF-1.4) se suma
 * aca la lista de dependencias, no en el DTO.
 */
export interface HealthStatus {
  status: 'ok';
  uptimeSeconds: number;
  version: string;
}
