import sql from './db'

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


  export async function setMember(first_name, last_name, email, active) {

    const users = await sql`
      INSERT INTO members (email, active)
        values(${first_name}, ${last_name}, ${email}, ${active})
        ON CONFLICT (email) 
	      DO UPDATE SET active = ${active}
        members.active;
    `
    console.log(users)
    return users
  }