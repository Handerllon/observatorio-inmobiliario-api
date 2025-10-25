import  App from './App';
import { logger } from './utils/Logger';

const PORT = parseInt(process.env.APP_PORT)

App.listen(PORT, () =>{
    logger.info(`🚀 ${process.env.APP_NAME} running on port ${PORT}`)
});