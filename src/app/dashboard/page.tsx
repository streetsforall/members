"use client";

import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import "./dashboard.css";

// Type definitions
interface Member {
  date: string;
  amount: number;
  stripe_fee: number;
  description: string;
  zip: string;
  chapter: string;
}

interface MemberArray {
  SF: Member[];
  LA: Member[];
  NA: Member[];
}

interface MerchItem {
  date: string;
  id: string;
  customer_spend: number;
  printful_price: number;
  total_profit: number;
  sf_profits: number;
  order?: any[];
}

interface ApiResponse {
  memberArray: MemberArray;
  all_merch_body: MerchItem[];
}

interface MemberRowProps {
  member: Member;
}

interface MerchRowProps {
  merch: MerchItem;
}

export default function LoginPage() {
  const [dateIn, setDateIn] = useState<string>("");
  const [dateOut, setDateOut] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string>("");

  const [sfMember, setSFMember] = useState<number>(0);
  const [sfMerch, setSFMerch] = useState<number>(0);
  const [flatMembers, setFlatMembers] = useState<Member[]>([]);

  const handleSubmit = async (): Promise<void> => {
    // Clear previous results and errors
    setResults(null);
    setError("");

    // Validate dates
    if (!dateIn || !dateOut) {
      setError("Please select both start and end dates");
      return;
    }

    if (new Date(dateIn) > new Date(dateOut)) {
      setError("Start date must be before end date");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/charge_server", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date_in: dateIn,
          date_out: dateOut,
        }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok) {
        setResults(data);
      } else {
        setError((data as any).error || "An error occurred");
      }
    } catch (err) {
      setError(`Failed to fetch data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (results) {
      // find total SF merch
      const sumSFMembers = results.memberArray.SF?.reduce((total: number, member: Member) => {
        return total + member.amount;
      }, 0) || 0;

      const sumNAMembers = results.memberArray.NA?.reduce((total: number, member: Member) => {
        return total + member.amount;
      }, 0) || 0;

      setSFMember(sumSFMembers + sumNAMembers / 2);

      const sumMerch = results.all_merch_body?.reduce((total: number, merch: MerchItem) => {
        return total + merch.total_profit;
      }, 0) || 0;

      const sumSfMerch = results.all_merch_body?.reduce((total: number, merch: MerchItem) => {
        return total + merch.sf_profits;
      }, 0) || 0;

      setFlatMembers(Object.values(results.memberArray).flat());

      setSFMerch(sumSfMerch);
    }
  }, [results]);

  const MemberRow: React.FC<MemberRowProps> = ({ member }) => {
    return (
      <tr>
        <td>{member.date}</td>
        <td>{member.chapter}</td>
        <td>${member.amount.toFixed(2)}</td>
        <td>${member.stripe_fee.toFixed(2)}</td>
        <td>{member.description}</td>
        <td>{member.zip}</td>
      </tr>
    );
  };

  const MerchRow: React.FC<MerchRowProps> = ({ merch }) => {
    console.log(merch);
    return (
      <tr>
        <td>{merch.date}</td>
        <td>{merch.id}</td>
        <td>${merch.customer_spend.toFixed(2)}</td>
        <td>${merch.printful_price.toFixed(2)}</td>
        <td>${merch.total_profit.toFixed(2)}</td>
        <td>${merch.sf_profits.toFixed(2)}</td>
        <td>{JSON.stringify(merch.order?.flat() || [])}</td>
      </tr>
    );
  };

  return (
    <div className="data_container">
      <h1 className="title">Date Range Data Request</h1>

      <div className="form">
        <div className="field">
          <label htmlFor="date_in" className="label">
            Start Date:
          </label>
          <input
            type="date"
            id="date_in"
            value={dateIn}
            onChange={(e) => setDateIn(e.target.value)}
            required
            className="input"
          />
        </div>

        <div className="field">
          <label htmlFor="date_out" className="label">
            End Date:
          </label>
          <input
            type="date"
            id="date_out"
            value={dateOut}
            onChange={(e) => setDateOut(e.target.value)}
            required
            className="input"
          />
        </div>

        <button onClick={handleSubmit} disabled={loading} className="button">
          {loading ? "Loading... (this may take a minute)" : "Submit"}
        </button>
      </div>

      {error && (
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className="results">
          <div className="section">
            <h3>SF Chapter Totals </h3>
            <p>SF Chapter Membership Total: ${sfMember.toFixed(2)}</p>
            <p>SF Chapter Merch Total: ${sfMerch.toFixed(2)}</p>
          </div>

          <div className="section">
            <h3>Member Data</h3>
            <p>SF Members: {results.memberArray.SF?.length || 0}</p>
            <p>LA Members: {results.memberArray.LA?.length || 0}</p>
            <p>NA Members: {results.memberArray.NA?.length || 0}</p>
          </div>

          <div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Chapter</th>
                  <th>Amount</th>
                  <th>Stripe Fee</th>
                  <th>Description</th>
                  <th>ZIP Code</th>
                </tr>
              </thead>
              <tbody>
                {flatMembers.map((member, index) => (
                  <MemberRow key={index} member={member} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="section">
            <h3>Merchandise Data</h3>
            <p>Total Merch Orders: {results.all_merch_body?.length || 0}</p>
          </div>

          <div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>ID</th>
                  <th>Full Retail</th>
                  <th>Printful Costs</th>
                  <th>Total Profit</th>
                  <th>SF Profits</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                {results.all_merch_body?.map((merch, index) => (
                  <MerchRow key={index} merch={merch} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="section">
            <details>
              <summary>Raw JSON Data</summary>
              <pre className="json">{JSON.stringify(results, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}