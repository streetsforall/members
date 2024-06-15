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



  export async function setMember(first_name:string, last_name:string, email:string, active:boolean, tier:number, last_amount:number) {
 
    // this will create a new member or
    // if email field matches an email in our database 
    // it will update the 'active' field

    const last_donation = (new Date()).toLocaleString("en-US")

    console.log(first_name, last_name, email, active, tier, last_amount, last_donation)

    const users = await sql`
      INSERT INTO members (first_name, last_name, email, active, tier, last_amount, last_donation)
        VALUES(${first_name}, ${last_name}, ${email}, ${active}, ${tier}, ${last_amount}, ${last_donation})
        ON CONFLICT (email) 
	      DO UPDATE SET active = ${active}, tier = ${tier}, last_amount = ${last_amount}
    `
    console.log(users)
    return users
  }



