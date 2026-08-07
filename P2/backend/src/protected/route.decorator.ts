import { SetMetadata } from '@nestjs/common';

export const ROUTE_KEY = 'route_name';
export const RouteName = (name: string) => SetMetadata(ROUTE_KEY, name);
