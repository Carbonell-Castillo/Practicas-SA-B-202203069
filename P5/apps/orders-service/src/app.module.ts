import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { OrdersModule } from './orders/orders.module';
import { HealthController } from './health/health.controller';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RabbitmqModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // El esquema se construye en memoria (code-first), sin escribir un
      // schema.gql a disco: así el contenedor de producción (que solo copia
      // dist/) no necesita el árbol de fuentes para arrancar.
      autoSchemaFile: true,
      sortSchema: true,
      playground: false,
      graphiql: true,
      // Apollo Server deshabilita la introspección por defecto cuando
      // NODE_ENV=production (que es justo el valor que usa el Dockerfile de
      // este servicio). Sin introspección, GraphiQL no puede traer el
      // schema y queda en blanco con "error fetching schema". Este es un
      // microservicio de práctica pensado para explorarse, así que la
      // dejamos siempre activa.
      introspection: true,
    }),
    OrdersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
