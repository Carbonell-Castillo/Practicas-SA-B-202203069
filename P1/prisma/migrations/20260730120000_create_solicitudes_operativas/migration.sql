-- CreateEnum
CREATE TYPE "estado_solicitud" AS ENUM ('REGISTRADA', 'EN_PROCESO', 'FINALIZADA');

-- CreateTable
CREATE TABLE "solicitudes_operativas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "titulo" VARCHAR(150) NOT NULL,
    "area_solicitante" VARCHAR(100) NOT NULL,
    "prioridad" INTEGER NOT NULL,
    "costo_estimado" DECIMAL(12,2) NOT NULL,
    "estado" "estado_solicitud" NOT NULL DEFAULT 'REGISTRADA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_operativas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_operativas_estado_idx" ON "solicitudes_operativas"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_operativas_prioridad_idx" ON "solicitudes_operativas"("prioridad");

-- CreateIndex
CREATE INDEX "solicitudes_operativas_created_at_idx" ON "solicitudes_operativas"("created_at");

-- CheckConstraint: prioridad debe estar entre 1 y 5 (Prisma no genera esto, se agrega a mano)
ALTER TABLE "solicitudes_operativas"
    ADD CONSTRAINT "solicitudes_operativas_prioridad_check"
    CHECK ("prioridad" BETWEEN 1 AND 5);

-- CheckConstraint: costo_estimado no puede ser negativo (Prisma no genera esto, se agrega a mano)
ALTER TABLE "solicitudes_operativas"
    ADD CONSTRAINT "solicitudes_operativas_costo_estimado_check"
    CHECK ("costo_estimado" >= 0);
