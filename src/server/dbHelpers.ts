import sql from './db.ts'

export async function retrieveMembers() {

    const users = await sql`
      SELECT
        first_name,
        last_name,
        email
      FROM members
    `
    console.log(users)
    return users
  }