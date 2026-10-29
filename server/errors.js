// Thrown by repos for bad input; the error handler turns it into a 400.
export class ValidationError extends Error {
  status = 400;
}
