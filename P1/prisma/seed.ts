// Seed idempotente para SolicitudOperativa.
// Usa UUIDs fijos y upsert por id, por lo que ejecutar este script varias
// veces nunca duplica registros.
import { PrismaClient, EstadoSolicitud, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const solicitudesSeed: Array<
  Prisma.SolicitudOperativaCreateInput & { id: string }
> = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    titulo: 'Adquisición de nuevo servidor',
    areaSolicitante: 'Infraestructura TI',
    prioridad: 3,
    costoEstimado: new Prisma.Decimal('2500.00'),
    estado: EstadoSolicitud.REGISTRADA,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    titulo: 'Renovación de licencias de software',
    areaSolicitante: 'Tecnología',
    prioridad: 2,
    costoEstimado: new Prisma.Decimal('1800.50'),
    estado: EstadoSolicitud.EN_PROCESO,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    titulo: 'Mantenimiento preventivo de planta eléctrica',
    areaSolicitante: 'Mantenimiento',
    prioridad: 5,
    costoEstimado: new Prisma.Decimal('950.75'),
    estado: EstadoSolicitud.FINALIZADA,
  },
];

async function main() {
  for (const solicitud of solicitudesSeed) {
    await prisma.solicitudOperativa.upsert({
      where: { id: solicitud.id },
      update: {},
      create: solicitud,
    });
  }
}

main()
  .then(async () => {
    console.log(
      `Seed completado: ${solicitudesSeed.length} solicitudes verificadas/creadas.`,
    );
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error('Error al ejecutar el seed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
