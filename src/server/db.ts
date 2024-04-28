import postgres from 'postgres'


const sql = postgres('', {
  host: process.env.DO_HOST,
  port: process.env.DO_PORT,
  database: process.env.DO_DB,
  username: process.env.DO_USERNAME,
  password: process.env.DO_PASSWORD, 
  ssl: process.env.DO_SSL
})
export default sql