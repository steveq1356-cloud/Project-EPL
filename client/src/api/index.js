// The single data layer for the UI. Components import `api` from here and nowhere else.
// To move to a hosted backend later, implement the same functions and swap this line.
import { restBackend } from './rest.js';

export const api = restBackend;
