import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Serveur MSW Node utilisé par le harness de tests. */
export const server = setupServer(...handlers);
