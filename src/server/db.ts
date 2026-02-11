import postgres from 'postgres'

const sql = postgres('', {
  host: process.env.DO_HOST,
  port: process.env.DO_PORT as unknown as number,
  database: process.env.DO_DB,
  username: process.env.DO_USERNAME,
  password: process.env.DO_PASSWORD,

})

export default sql