import sql from './db'

export async function retrieveMembers() {

    const users = await sql`
      SELECT
        first_name,
        last_name,
        email,
        active
      FROM members
    `
    console.log(users)
    return users
  }


  export async function setMember(first_name:string, last_name:string, email:string, active:boolean) {
 
    // this will create a new member or
    // if email field matches a member in our database 
    // it will update the 'active' field

    console.log(first_name, last_name, email, active)
    const users = await sql`
      INSERT INTO members (first_name, last_name, email, active)
        VALUES(${first_name}, ${last_name}, ${email}, ${active})
        ON CONFLICT (email) 
	      DO UPDATE SET active = ${active}
    `
    console.log(users)
    return users
  }