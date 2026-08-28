import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface RemoteProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
}

/**
 * Cliente GraphQL hacia products-service. Es el único punto de comunicación
 * entre orders-service y products-service: orders-service nunca toca la base
 * de datos de productos directamente (desacoplamiento entre microservicios).
 */
@Injectable()
export class ProductsClientService {
  private readonly logger = new Logger(ProductsClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get graphqlUrl(): string {
    return this.configService.get<string>('PRODUCTS_SERVICE_URL', 'http://localhost:4002/graphql');
  }

  private async query<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.graphqlUrl, { query, variables }, { timeout: 3000 }),
      );
      if (response.data.errors?.length) {
        throw new Error(response.data.errors[0].message);
      }
      return response.data.data;
    } catch (error: any) {
      this.logger.error(`Error al consultar products-service: ${error.message}`);
      throw new ServiceUnavailableException('products-service no está disponible');
    }
  }

  async getProduct(id: number): Promise<RemoteProduct> {
    const data = await this.query<{ product: RemoteProduct | null }>(
      `query($id: Int!) { product(id: $id) { id name price stock } }`,
      { id },
    );
    if (!data.product) {
      throw new NotFoundException(`Producto ${id} no existe en products-service`);
    }
    return data.product;
  }

  async decreaseStock(id: number, quantity: number): Promise<RemoteProduct> {
    const data = await this.query<{ decreaseStock: RemoteProduct }>(
      `mutation($id: Int!, $quantity: Int!) { decreaseStock(id: $id, quantity: $quantity) { id name price stock } }`,
      { id, quantity },
    );
    return data.decreaseStock;
  }
}
