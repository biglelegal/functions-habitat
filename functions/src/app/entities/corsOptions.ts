import { environment } from '../../environments/environment';

export const corsOptions = {
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'X-Access-Token'],
    credentials: true,
    methods: 'POST',
    preflightContinue: false,
    origin: environment.apiUrl
};
