import  App from './App';

const PORT = parseInt(process.env.APP_PORT)

App.listen(PORT, () =>{
    console.log(`${process.env.APP_NAME} running on port ${PORT}`)
});