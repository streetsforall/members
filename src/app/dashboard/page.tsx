import { useRouter } from "next/router";
import { useState, useEffect } from "react";

export default async function LoginPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const data = await fetch(`${baseUrl}/api/stats`);
  const members = await data.json();

  console.log(members);

  function Dashboard() {
    return (
      <div className="login_page">
        <div>
          
          <h3>Members Dashboard</h3>
          <table>
            <thead>
  
            </thead>
            <tbody>
              <tr>
                <td>Total Members</td>
                <td>{members?.["current donations"]}</td>
              </tr>
              <tr>
                <td>Total Income</td>
                <td>{'$'+members?.["total monthly"].toLocaleString()}</td>
              </tr>
              <tr>
                <td>Total Annual Estimate</td>
                <td>{'$'+members?.["total annual estimate"].toLocaleString()}</td>
              </tr>
              <tr>
                <td>LA Cut</td>
                <td>{'$'+ members?.["LA cut monthly"].toLocaleString()}</td>
              </tr>
              <tr>
                <td>SF Cut</td>
                <td>{'$'+ members?.["SF cut monthly"].toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{borderTop: "1px solid blue", paddingTop: "1rem" }}>Regional Stats</h3>
          <table>
            <thead style={{textAlign: "left"}}>
              <tr style={{color: "gray"}}>
                <th>Region</th>
                <th>Total Members</th>
                <th>Monthly Income</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>LA</td>
                <td>{members?.LA?.total_count}</td>
                <td>{'$'+ members?.LA?.total_monthly.toLocaleString()}</td>
              </tr>
              <tr>
                <td>SF</td>
                <td>{members?.SF?.total_count}</td>
                <td>{'$'+ members?.SF?.total_monthly.toLocaleString()}</td>
              </tr>
              <tr>
                <td>CA</td>
                <td>{members?.CA?.total_count}</td>
                <td>{'$'+ members?.CA?.total_monthly.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Dashboard />
    </div>
  );
}
