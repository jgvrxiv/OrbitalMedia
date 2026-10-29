// Escala del mundo. 1 unidad de la escena = 1 casilla = 12 m.
export const METERS_PER_TILE = 12;
export const GRID_N = 128; // casillas por lado (128 × 12 m ≈ 1,5 km)
export const FLOOR_M = 3.1; // altura de un piso residencial en metros
export const m2u = (m) => m / METERS_PER_TILE; // metros -> unidades
export const u2m = (u) => u * METERS_PER_TILE; // unidades -> metros
