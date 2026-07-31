import { TransformFnParams } from 'class-transformer';

/** Recorta espacios en los extremos de valores string; deja pasar el resto sin tocar. */
export function trimTransform({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
